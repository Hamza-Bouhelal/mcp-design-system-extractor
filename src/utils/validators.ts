import { z } from 'zod';
import {
  ListComponentsInput,
  GetComponentHTMLInput,
  SearchComponentsInput,
  GetComponentDependenciesInput,
  GetThemeInfoInput,
} from '../types/tools.js';

const ListComponentsInputSchema = z.object({
  category: z.string().optional(),
  compact: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

const GetComponentHTMLInputSchema = z.object({
  componentId: z.string(),
  includeStyles: z.boolean().optional(),
  variantsOnly: z.boolean().optional(),
  async: z.boolean().optional(),
  timeout: z.number().int().min(5000).max(60000).optional(),
});

const SearchComponentsInputSchema = z
  .object({
    query: z.string().optional(),
    purpose: z.string().optional(),
    searchIn: z.enum(['name', 'title', 'category', 'all']).optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
  .refine(data => data.query !== undefined || data.purpose !== undefined, {
    message: 'Either query or purpose must be provided',
  });

const GetComponentDependenciesInputSchema = z.object({
  componentId: z.string(),
});

const GetThemeInfoInputSchema = z.object({
  includeAll: z.boolean().optional(),
});

export function validateListComponentsInput(input: any): ListComponentsInput {
  const parsed = ListComponentsInputSchema.parse(input);
  const result: ListComponentsInput = {};
  if (parsed.category !== undefined) {
    result.category = parsed.category;
  }
  if (parsed.compact !== undefined) {
    result.compact = parsed.compact;
  }
  if (parsed.page !== undefined) {
    result.page = parsed.page;
  }
  if (parsed.pageSize !== undefined) {
    result.pageSize = parsed.pageSize;
  }
  return result;
}

export function validateGetComponentHTMLInput(input: any): GetComponentHTMLInput {
  const parsed = GetComponentHTMLInputSchema.parse(input);
  const result: GetComponentHTMLInput = {
    componentId: parsed.componentId,
  };
  if (parsed.includeStyles !== undefined) {
    result.includeStyles = parsed.includeStyles;
  }
  if (parsed.variantsOnly !== undefined) {
    result.variantsOnly = parsed.variantsOnly;
  }
  if (parsed.async !== undefined) {
    result.async = parsed.async;
  }
  if (parsed.timeout !== undefined) {
    result.timeout = parsed.timeout;
  }
  return result;
}

export function validateSearchComponentsInput(input: any): SearchComponentsInput {
  const parsed = SearchComponentsInputSchema.parse(input);
  const result: SearchComponentsInput = {};
  if (parsed.query !== undefined) {
    result.query = parsed.query;
  }
  if (parsed.purpose !== undefined) {
    result.purpose = parsed.purpose;
  }
  if (parsed.searchIn !== undefined) {
    result.searchIn = parsed.searchIn;
  }
  if (parsed.page !== undefined) {
    result.page = parsed.page;
  }
  if (parsed.pageSize !== undefined) {
    result.pageSize = parsed.pageSize;
  }
  return result;
}

export function validateGetComponentDependenciesInput(input: any): GetComponentDependenciesInput {
  return GetComponentDependenciesInputSchema.parse(input);
}

export function validateGetThemeInfoInput(input: any): GetThemeInfoInput {
  const parsed = GetThemeInfoInputSchema.parse(input);
  const result: GetThemeInfoInput = {};
  if (parsed.includeAll !== undefined) {
    result.includeAll = parsed.includeAll;
  }
  return result;
}
