import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';

import { ReportTemplate } from '../../entities/reportTemplate.entity';

/**
 * Report template repository port interface
 * Output port for report template persistence following Hexagonal Architecture
 */
export interface IReportTemplateRepository
  extends IReadRepository<ReportTemplate>,
    IWriteRepository<ReportTemplate> {
  /**
   * Find templates by type
   */
  findByType(type: string, orgId: string): Promise<ReportTemplate[]>;

  /**
   * Find active templates
   */
  findActive(orgId: string): Promise<ReportTemplate[]>;

  /**
   * Find template by name
   */
  findByName(name: string, orgId: string): Promise<ReportTemplate | null>;

  /**
   * Check if template exists by name
   */
  existsByName(name: string, orgId: string): Promise<boolean>;

  /**
   * Find templates by creator
   */
  findByCreatedBy(userId: string, orgId: string): Promise<ReportTemplate[]>;
}
