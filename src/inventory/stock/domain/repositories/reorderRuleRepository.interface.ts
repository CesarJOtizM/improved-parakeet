import { ReorderRule } from '@stock/domain/entities/reorderRule.entity';

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
