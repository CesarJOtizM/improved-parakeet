import { REPORT_TYPES } from '../valueObjects/reportType.valueObject';

import type { IReportParametersInput } from '../valueObjects/reportParameters.valueObject';

/**
 * Report types that can be cached
 * Only historical reports with dateRange should be cached
 */
export const CACHEABLE_REPORT_TYPES = [
  REPORT_TYPES.MOVEMENT_HISTORY,
  REPORT_TYPES.MOVEMENTS,
  REPORT_TYPES.SALES,
  REPORT_TYPES.SALES_BY_PRODUCT,
  REPORT_TYPES.SALES_BY_WAREHOUSE,
  REPORT_TYPES.RETURNS,
  REPORT_TYPES.RETURNS_BY_TYPE,
  REPORT_TYPES.RETURNS_BY_PRODUCT,
  REPORT_TYPES.FINANCIAL,
  REPORT_TYPES.TURNOVER,
] as const;

/**
 * Default TTL values (in seconds)
 */
export const DEFAULT_CACHE_TTL = {
  VIEW: 3600, // 1 hour for view reports
  EXPORT: 86400, // 24 hours for exports
} as const;

/**
 * TTL overrides for specific report types (in seconds)
 * If a report type is not listed here, it uses the default TTL
 */
export const REPORT_TYPE_TTL_OVERRIDES: Record<string, { view?: number; export?: number }> = {
  [REPORT_TYPES.MOVEMENT_HISTORY]: {
    view: 7200, // 2 hours
    export: 86400, // 24 hours
  },
  [REPORT_TYPES.SALES]: {
    view: 3600, // 1 hour
    export: 86400, // 24 hours
  },
  [REPORT_TYPES.FINANCIAL]: {
    view: 1800, // 30 minutes (financial data changes more frequently)
    export: 43200, // 12 hours
  },
};

/**
 * Check if a report type is cacheable
 */
export function isCacheableReportType(reportType: string): boolean {
  return CACHEABLE_REPORT_TYPES.includes(reportType as (typeof CACHEABLE_REPORT_TYPES)[number]);
}

/**
 * Check if a report should be cached based on type and parameters
 * A report is cacheable if:
 * 1. It's a cacheable report type
 * 2. It has a dateRange (historical data, not current state)
 * OR
 * 3. It's an export (all exports are cacheable)
 */
export function shouldCacheReport(
  reportType: string,
  parameters: IReportParametersInput,
  isExport: boolean = false
): boolean {
  // All exports are cacheable
  if (isExport) {
    return true;
  }

  // For views, only cache if it's a cacheable type AND has dateRange
  if (!isCacheableReportType(reportType)) {
    return false;
  }

  // Must have dateRange to be cacheable (historical data)
  return !!parameters.dateRange;
}

/**
 * Get TTL for a view report
 */
export function getTtlForView(
  reportType: string,
  defaultTtl: number = DEFAULT_CACHE_TTL.VIEW
): number {
  const override = REPORT_TYPE_TTL_OVERRIDES[reportType];
  return override?.view ?? defaultTtl;
}

/**
 * Get TTL for an export report
 */
export function getTtlForExport(
  reportType: string,
  defaultTtl: number = DEFAULT_CACHE_TTL.EXPORT
): number {
  const override = REPORT_TYPE_TTL_OVERRIDES[reportType];
  return override?.export ?? defaultTtl;
}
