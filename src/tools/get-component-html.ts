import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorybookClient } from '../utils/storybook-client.js';
import { formatSuccessResponse, handleErrorWithContext } from '../utils/error-handler.js';
import { validateGetComponentHTMLInput } from '../utils/validators.js';
import { jobQueue } from '../services/job-queue.js';

export const getComponentHTMLTool: Tool = {
  name: 'get_component_html',
  description:
    'Extract HTML from a component. Default is async (returns job_id, poll with job_status). Set async=false for sync mode. Use variantsOnly=true to get variant list.',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description:
          'The story ID in format "component-name--story-name" (e.g., "button--primary") or component ID (e.g., "button") when using variantsOnly.',
      },
      includeStyles: {
        type: 'boolean',
        description:
          'Whether to include extracted CSS styles in the response. Storybook boilerplate CSS is filtered out. Default: false.',
      },
      variantsOnly: {
        type: 'boolean',
        description:
          'If true, returns only the list of available variants/stories for the component (synchronous). Use component ID without story suffix.',
      },
      async: {
        type: 'boolean',
        description:
          'If true (default), returns job_id immediately - use job_status to poll for results. If false, waits for result synchronously.',
      },
      timeout: {
        type: 'number',
        description:
          'Custom timeout in milliseconds (5000-60000). Only used in sync mode (async=false). Default is 15000ms.',
      },
    },
    required: ['componentId'],
  },
};

export async function handleGetComponentHTML(input: any) {
  let validatedInput: any;
  try {
    validatedInput = validateGetComponentHTMLInput(input);

    // Handle variantsOnly mode - return list of variants synchronously (fast operation)
    if (validatedInput.variantsOnly) {
      const client = new StorybookClient();
      const storiesIndex = await client.fetchStoriesIndex();
      const storiesData = storiesIndex.stories || storiesIndex.entries;
      const componentId = validatedInput.componentId.toLowerCase();

      const variants: string[] = [];
      for (const [storyId] of Object.entries(storiesData as Record<string, any>)) {
        const storyComponentId = storyId.split('--')[0] || '';
        if (storyComponentId.toLowerCase() === componentId) {
          const variantName = storyId.split('--')[1] || 'default';
          variants.push(variantName);
        }
      }

      if (variants.length === 0) {
        throw new Error(`No variants found for component: ${validatedInput.componentId}`);
      }

      return formatSuccessResponse(
        { componentId: validatedInput.componentId, variants },
        `Found ${variants.length} variants for component: ${validatedInput.componentId}`
      );
    }

    // Check if sync mode requested (async defaults to true)
    const isAsync = validatedInput.async !== false;

    if (isAsync) {
      // Async mode - enqueue job and return immediately
      const jobId = jobQueue.enqueue('get_component_html', validatedInput);

      return formatSuccessResponse(
        {
          job_id: jobId,
          status: 'queued',
          component_id: validatedInput.componentId,
        },
        `Job queued for component: ${validatedInput.componentId}. Use job_status to check progress.`
      );
    }

    // Sync mode - wait for result
    const result = await jobQueue.runSync('get_component_html', validatedInput);

    return formatSuccessResponse(
      result,
      `Successfully extracted HTML for component: ${validatedInput.componentId}`
    );
  } catch (error) {
    return handleErrorWithContext(error, 'get component HTML', {
      storyId: validatedInput?.componentId || 'unknown',
      resource: 'component HTML',
    });
  }
}
