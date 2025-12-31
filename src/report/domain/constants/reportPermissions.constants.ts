import { REPORT_TYPES } from '../valueObjects/reportType.valueObject';

/**
 * Report types that require sensitive permissions
 * These reports contain financial or sensitive business data
 */
export const SENSITIVE_REPORT_TYPES = [
  REPORT_TYPES.FINANCIAL,
  REPORT_TYPES.VALUATION,
  REPORT_TYPES.SALES,
  REPORT_TYPES.SALES_BY_PRODUCT,
  REPORT_TYPES.SALES_BY_WAREHOUSE,
] as const;

/**
 * Check if a report type is sensitive
 */
export function isSensitiveReportType(reportType: string): boolean {
  return SENSITIVE_REPORT_TYPES.includes(reportType as (typeof SENSITIVE_REPORT_TYPES)[number]);
}

/**
 * Get required permission for a report type
 */
export function getRequiredPermissionForReport(reportType: string): string {
  if (isSensitiveReportType(reportType)) {
    return 'REPORTS:READ_SENSITIVE';
  }
  return 'REPORTS:READ';
}
