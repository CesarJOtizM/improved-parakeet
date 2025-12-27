import { ReorderRule } from '@stock/domain/entities/reorderRule.entity';

/**
 * Reorder rule repository port interface
 * Output port for reorder rule persistence following Hexagonal Architecture
 */
export interface IReorderRuleRepository {
  /**
   * Finds a reorder rule by product and warehouse
   */
  findByProductAndWarehouse(
    productId: string,
    warehouseId: string,
    orgId: string
  ): Promise<ReorderRule | null>;
}
