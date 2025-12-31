import { RequirePermissions } from '@auth/security/decorators/auth.decorators';
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
 * Automatically determines if the report is sensitive and requires REPORTS:READ_SENSITIVE
 * or just REPORTS:READ
 */
export const RequireReportPermission = (reportType: string) => {
  const requiredPermission = getRequiredPermissionForReport(reportType);
  return applyDecorators(
    SetReportType(reportType),
    RequirePermissions({ permissions: [requiredPermission] })
  );
};

/**
 * Decorator to require export permission
 */
export const RequireExportPermission = () => {
  return RequirePermissions({ permissions: ['REPORTS:EXPORT'] });
};
