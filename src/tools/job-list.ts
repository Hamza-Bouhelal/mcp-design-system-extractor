import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { formatSuccessResponse, handleErrorWithContext } from '../utils/error-handler.js';
import { jobQueue } from '../services/job-queue.js';
import { z } from 'zod';

export const jobListTool: Tool = {
  name: 'job_list',
  description:
    'List all jobs with their status. Shows what each job is processing and whether it is still running.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['all', 'active', 'completed'],
        description:
          'Filter by status: "all" (default), "active" (queued/running), "completed" (completed/failed/cancelled)',
      },
    },
  },
};

const JobListInputSchema = z.object({
  status: z.enum(['all', 'active', 'completed']).optional(),
});

export async function handleJobList(input: any) {
  try {
    const validated = JobListInputSchema.parse(input || {});
    const filter = validated.status || 'all';
    const jobs = jobQueue.listJobs(filter);
    const stats = jobQueue.getStats();

    return formatSuccessResponse(
      { jobs, stats },
      `Found ${jobs.length} jobs (${stats.running} running, ${stats.queued} queued)`
    );
  } catch (error) {
    return handleErrorWithContext(error, 'job list', { resource: 'job list' });
  }
}
