import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { SetMetadata, applyDecorators } from '@nestjs/common';

import { getRequiredPermissionForReport } from '../domain/constants/reportPermissions.constants';

const REPORT_TYPE_KEY = 'reportType';

/**
 * Decorator to set the report type metadata
 */
export const SetReportType = (reportType: string) => {
  return SetMetadata(REPORT_TYPE_KEY, reportType);
};

/**
 * Decorator to require appropriate permission for a report type
 * Uses the unified PermissionGuard via shared RequirePermissions decorator
 */
export const RequireReportPermission = (reportType: string) => {
  const requiredPermission = getRequiredPermissionForReport(reportType);
  return applyDecorators(SetReportType(reportType), RequirePermissions(requiredPermission));
};

/**
 * Decorator to require export permission
 */
export const RequireExportPermission = () => {
  return RequirePermissions('REPORTS:EXPORT');
};
