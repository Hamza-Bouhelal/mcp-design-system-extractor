/**
 * Standardized timeout values for different operation types
 */
export const TIMEOUT_VALUES = {
  /**
   * Medium operations (10 seconds)
   * - HTML content fetching
   * - Stories index loading
   */
  MEDIUM: 10000,

  /**
   * Heavy operations (15 seconds)
   * - CSS file fetching and parsing
   * - Puppeteer browser operations
   */
  HEAVY: 15000,
} as const;

/**
 * Operation-specific timeout mappings
 */
export const OPERATION_TIMEOUTS = {
  fetchStoriesIndex: TIMEOUT_VALUES.MEDIUM,
  fetchComponentHTML: TIMEOUT_VALUES.MEDIUM,
  fetchExternalCSS: TIMEOUT_VALUES.HEAVY,
} as const;

/**
 * Environment-based timeout multipliers
 */
export function getEnvironmentTimeout(baseTimeout: number): number {
  const environment = process.env.NODE_ENV;
  const ciMode = process.env.CI === 'true';

  // Increase timeouts in CI environments
  if (ciMode) {
    return Math.floor(baseTimeout * 1.5);
  }

  // Increase timeouts in development for debugging
  if (environment === 'development') {
    return Math.floor(baseTimeout * 1.2);
  }

  return baseTimeout;
}
