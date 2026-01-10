import { ComponentHTML } from '../types/storybook.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { filterStorybookStyles } from '../utils/html-css-parser.js';
import { getEnvironmentTimeout, OPERATION_TIMEOUTS } from '../utils/timeout-constants.js';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  status: JobStatus;
  toolName: string;
  input: any;
  result?: any;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface JobResult {
  job_id: string;
  status: JobStatus;
  result?: any;
  error?: string;
  created_at: number;
  started_at?: number;
  completed_at?: number;
}

class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private queue: string[] = [];
  private processing: Set<string> = new Set();
  private maxConcurrent = 2;
  private processorInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private storybookClient: StorybookClient | null = null;

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or create Storybook client
   */
  private getClient(): StorybookClient {
    if (!this.storybookClient) {
      this.storybookClient = new StorybookClient();
    }
    return this.storybookClient;
  }

  /**
   * Enqueue a new job
   */
  enqueue(toolName: string, input: any): string {
    const jobId = this.generateJobId();
    const job: Job = {
      id: jobId,
      status: 'queued',
      toolName,
      input,
      createdAt: Date.now(),
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);

    // Trigger processing
    this.processQueue();

    return jobId;
  }

  /**
   * Get job status and result
   */
  getStatus(jobId: string): JobResult | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      job_id: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      created_at: job.createdAt,
      started_at: job.startedAt,
      completed_at: job.completedAt,
    };
  }

  /**
   * Cancel a job
   */
  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'queued') {
      job.status = 'cancelled';
      job.completedAt = Date.now();
      // Remove from queue
      const index = this.queue.indexOf(jobId);
      if (index > -1) {
        this.queue.splice(index, 1);
      }
      return true;
    }

    if (job.status === 'running') {
      // Mark as cancelled - actual cancellation is not possible mid-execution
      job.status = 'cancelled';
      job.completedAt = Date.now();
      return true;
    }

    return false;
  }

  /**
   * Process queued jobs
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
      const jobId = this.queue.shift();
      if (!jobId) break;

      const job = this.jobs.get(jobId);
      if (!job || job.status === 'cancelled') continue;

      this.processing.add(jobId);
      this.executeJob(jobId).finally(() => {
        this.processing.delete(jobId);
        // Check for more jobs
        if (this.queue.length > 0) {
          this.processQueue();
        }
      });
    }
  }

  /**
   * Execute a job
   */
  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.startedAt = Date.now();

    try {
      if (job.toolName === 'get_component_html') {
        const result = await this.executeGetComponentHTML(job.input);

        // Check if cancelled during execution
        if (job.status === 'cancelled') return;

        job.result = result;
        job.status = 'completed';
      } else {
        throw new Error(`Unknown tool: ${job.toolName}`);
      }
    } catch (error: any) {
      if (job.status !== 'cancelled') {
        job.error = error.message || 'Unknown error';
        job.status = 'failed';
      }
    }

    job.completedAt = Date.now();
  }

  /**
   * Run get_component_html synchronously (waits for result)
   */
  async runSync(toolName: string, input: any): Promise<any> {
    if (toolName === 'get_component_html') {
      return this.executeGetComponentHTML(input);
    }
    throw new Error(`Unknown tool: ${toolName}`);
  }

  /**
   * Execute get_component_html logic
   */
  private async executeGetComponentHTML(input: any): Promise<any> {
    const client = this.getClient();
    const timeout = input.timeout
      ? getEnvironmentTimeout(input.timeout)
      : getEnvironmentTimeout(OPERATION_TIMEOUTS.fetchComponentHTML);

    // Auto-resolve componentId if it doesn't contain variant suffix
    let storyId = input.componentId;
    if (!storyId.includes('--')) {
      const storiesIndex = await client.fetchStoriesIndex();
      const storiesData = storiesIndex.stories || storiesIndex.entries;
      const componentIdLower = storyId.toLowerCase();

      // Find first matching story (prefer --default if exists)
      let resolvedStoryId: string | null = null;
      let defaultStoryId: string | null = null;

      for (const [id] of Object.entries(storiesData as Record<string, any>)) {
        const storyComponentId = id.split('--')[0];
        if (storyComponentId.toLowerCase() === componentIdLower) {
          if (!resolvedStoryId) resolvedStoryId = id;
          if (id.endsWith('--default')) defaultStoryId = id;
        }
      }

      storyId = defaultStoryId || resolvedStoryId;
      if (!storyId) {
        throw new Error(`No stories found for component: ${input.componentId}`);
      }
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);
    });

    const componentHTML = (await Promise.race([
      client.fetchComponentHTML(storyId),
      timeoutPromise,
    ])) as ComponentHTML;

    // Filter Storybook CSS if styles requested
    const filteredStyles = input.includeStyles
      ? filterStorybookStyles(componentHTML.styles || [])
      : undefined;

    return {
      storyId: componentHTML.storyId,
      html: componentHTML.html,
      classes: componentHTML.classes,
      ...(filteredStyles && { styles: filteredStyles }),
    };
  }

  /**
   * Clean up old completed jobs (TTL: 1 hour)
   */
  private cleanup(): void {
    const ttl = 60 * 60 * 1000; // 1 hour
    const now = Date.now();

    for (const [jobId, job] of this.jobs) {
      if (
        job.completedAt &&
        (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
        now - job.completedAt > ttl
      ) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Start background processor
   */
  startProcessor(): void {
    if (this.processorInterval) return;

    // Process queue every second
    this.processorInterval = setInterval(() => {
      if (this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
        this.processQueue();
      }
    }, 1000);

    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop background processor
   */
  stopProcessor(): void {
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
      this.processorInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): { queued: number; running: number; completed: number; failed: number } {
    let queued = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      switch (job.status) {
        case 'queued':
          queued++;
          break;
        case 'running':
          running++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
        case 'cancelled':
          failed++;
          break;
      }
    }

    return { queued, running, completed, failed };
  }

  /**
   * List all jobs with optional filter
   */
  listJobs(
    filter: 'all' | 'active' | 'completed' = 'all'
  ): Array<{
    job_id: string;
    status: JobStatus;
    component_id: string;
    created_at: number;
    started_at?: number;
  }> {
    const result: Array<{
      job_id: string;
      status: JobStatus;
      component_id: string;
      created_at: number;
      started_at?: number;
    }> = [];

    for (const job of this.jobs.values()) {
      // Apply filter
      if (filter === 'active' && !['queued', 'running'].includes(job.status)) continue;
      if (filter === 'completed' && ['queued', 'running'].includes(job.status)) continue;

      result.push({
        job_id: job.id,
        status: job.status,
        component_id: job.input?.componentId || 'unknown',
        created_at: job.createdAt,
        started_at: job.startedAt,
      });
    }

    return result;
  }
}

export const jobQueue = new JobQueue();
