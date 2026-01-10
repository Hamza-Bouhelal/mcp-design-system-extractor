import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { formatSuccessResponse, handleErrorWithContext } from '../utils/error-handler.js';
import { jobQueue } from '../services/job-queue.js';
import { z } from 'zod';

export const jobCancelTool: Tool = {
  name: 'job_cancel',
  description: 'Cancel a queued or running job. Returns whether the cancellation was successful.',
  inputSchema: {
    type: 'object',
    properties: {
      job_id: {
        type: 'string',
        description: 'The job ID to cancel',
      },
    },
    required: ['job_id'],
  },
};

const JobCancelInputSchema = z.object({
  job_id: z.string(),
});

export async function handleJobCancel(input: any) {
  try {
    const validated = JobCancelInputSchema.parse(input);
    const cancelled = jobQueue.cancel(validated.job_id);

    if (cancelled) {
      return formatSuccessResponse(
        { job_id: validated.job_id, cancelled: true },
        `Job ${validated.job_id} has been cancelled`
      );
    } else {
      return formatSuccessResponse(
        { job_id: validated.job_id, cancelled: false },
        `Job ${validated.job_id} could not be cancelled (not found or already completed)`
      );
    }
  } catch (error) {
    return handleErrorWithContext(error, 'job cancel', {
      resource: 'job cancel',
    });
  }
}
