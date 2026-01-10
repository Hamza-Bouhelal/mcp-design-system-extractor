import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { formatSuccessResponse, handleErrorWithContext } from '../utils/error-handler.js';
import { jobQueue } from '../services/job-queue.js';
import { z } from 'zod';

export const jobStatusTool: Tool = {
  name: 'job_status',
  description:
    'Check the status of an async job. Returns status, progress, and result when completed. Poll this endpoint to get results from get_component_html.',
  inputSchema: {
    type: 'object',
    properties: {
      job_id: {
        type: 'string',
        description: 'The job ID returned from get_component_html',
      },
    },
    required: ['job_id'],
  },
};

const JobStatusInputSchema = z.object({
  job_id: z.string(),
});

export async function handleJobStatus(input: any) {
  try {
    const validated = JobStatusInputSchema.parse(input);
    const jobResult = jobQueue.getStatus(validated.job_id);

    if (!jobResult) {
      throw new Error(`Job not found: ${validated.job_id}`);
    }

    const statusMessages: Record<string, string> = {
      queued: 'Job is waiting in queue',
      running: 'Job is currently processing',
      completed: 'Job completed successfully',
      failed: 'Job failed',
      cancelled: 'Job was cancelled',
    };

    return formatSuccessResponse(
      jobResult,
      statusMessages[jobResult.status] || `Job status: ${jobResult.status}`
    );
  } catch (error) {
    return handleErrorWithContext(error, 'job status', {
      resource: 'job status',
    });
  }
}
