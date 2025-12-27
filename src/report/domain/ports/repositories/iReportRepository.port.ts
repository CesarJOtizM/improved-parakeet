import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';

import { Report } from '../../entities/report.entity';

/**
 * Report repository port interface
 * Output port for report persistence following Hexagonal Architecture
 * Note: Used for audit/logging of report executions, not for storing report data
 */
export interface IReportRepository extends IReadRepository<Report>, IWriteRepository<Report> {
  /**
   * Find reports by type
   */
  findByType(type: string, orgId: string): Promise<Report[]>;

  /**
   * Find reports by template
   */
  findByTemplate(templateId: string, orgId: string): Promise<Report[]>;

  /**
   * Find reports by status
   */
  findByStatus(status: string, orgId: string): Promise<Report[]>;

  /**
   * Find reports by date range
   */
  findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Report[]>;

  /**
   * Find reports by user who generated them
   */
  findByGeneratedBy(userId: string, orgId: string): Promise<Report[]>;
}
