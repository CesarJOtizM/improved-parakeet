import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';

import { ImportBatch } from '../../entities/importBatch.entity';

import type { ImportStatusValue } from '../../valueObjects/importStatus.valueObject';
import type { ImportTypeValue } from '../../valueObjects/importType.valueObject';

/**
 * Import Batch Repository Port
 * Output port for import batch persistence following Hexagonal Architecture
 */
export interface IImportBatchRepository
  extends IReadRepository<ImportBatch>, IWriteRepository<ImportBatch> {
  /**
   * Find import batches by type
   */
  findByType(type: ImportTypeValue, orgId: string): Promise<ImportBatch[]>;

  /**
   * Find import batches by status
   */
  findByStatus(status: ImportStatusValue, orgId: string): Promise<ImportBatch[]>;

  /**
   * Find import batches by creator
   */
  findByCreatedBy(userId: string, orgId: string): Promise<ImportBatch[]>;

  /**
   * Find import batches by type and status
   */
  findByTypeAndStatus(
    type: ImportTypeValue,
    status: ImportStatusValue,
    orgId: string
  ): Promise<ImportBatch[]>;

  /**
   * Find recent import batches
   */
  findRecent(orgId: string, limit?: number): Promise<ImportBatch[]>;

  /**
   * Count import batches by status
   */
  countByStatus(status: ImportStatusValue, orgId: string): Promise<number>;
}
