import { ReorderRule } from '@stock/domain/entities/reorderRule.entity';

/**
 * Reorder rule repository port interface
 * Output port for reorder rule persistence following Hexagonal Architecture
 */
export interface IReorderRuleRepository {
  /**
   * Finds all reorder rules for an organization
   */
  findAll(orgId: string): Promise<ReorderRule[]>;

  /**
   * Finds a reorder rule by its ID
   */
  findById(id: string, orgId: string): Promise<ReorderRule | null>;

  /**
   * Finds a reorder rule by product and warehouse
   */
  findByProductAndWarehouse(
    productId: string,
    warehouseId: string,
    orgId: string
  ): Promise<ReorderRule | null>;

  /**
   * Creates a new reorder rule
   */
  create(rule: ReorderRule): Promise<ReorderRule>;

  /**
   * Updates an existing reorder rule
   */
  update(rule: ReorderRule): Promise<ReorderRule>;

  /**
   * Deletes a reorder rule by ID
   */
  delete(id: string, orgId: string): Promise<void>;
}
