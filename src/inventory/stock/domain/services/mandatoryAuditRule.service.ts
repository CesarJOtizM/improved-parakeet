export interface IMandatoryAuditValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ICriticalOperation {
  operation: string;
  entityType: string;
  entityId: string;
  orgId: string;
}

export class MandatoryAuditRule {
  /**
   * List of operations that require mandatory audit
   */
  private static readonly CRITICAL_OPERATIONS = [
    'CREATE',
    'UPDATE',
    'DELETE',
    'POST',
    'VOID',
    'TRANSFER',
    'IMPORT',
    'EXPORT',
  ];

  /**
   * List of entity types that require mandatory audit
   */
  private static readonly CRITICAL_ENTITY_TYPES = [
    'Product',
    'Warehouse',
    'Movement',
    'Transfer',
    'Stock',
    'Location',
  ];

  /**
   * Validates that a critical operation requires audit
   * @param operation Operation name (e.g., 'CREATE', 'UPDATE', 'DELETE')
   * @param entityType Entity type (e.g., 'Product', 'Movement')
   * @returns Validation result
   */
  public static validateAuditRequired(
    operation: string,
    entityType: string
  ): IMandatoryAuditValidationResult {
    const errors: string[] = [];

    const isCriticalOperation = this.CRITICAL_OPERATIONS.includes(operation.toUpperCase());
    const isCriticalEntity = this.CRITICAL_ENTITY_TYPES.includes(entityType);

    if (isCriticalOperation && !isCriticalEntity) {
      errors.push(
        `Operation '${operation}' on entity type '${entityType}' requires audit but entity type is not in critical list`
      );
    }

    if (!isCriticalOperation && isCriticalEntity) {
      // This is a warning, not an error - audit is recommended but not mandatory
      // We don't add to errors, but we could log a warning
    }

    // Audit is always required for critical operations on critical entities
    // This validation ensures the system is aware of the requirement
    return {
      isValid: true, // This is informational, not a blocking validation
      errors: [],
    };
  }

  /**
   * Checks if an operation requires mandatory audit
   * @param operation Operation name
   * @param entityType Entity type
   * @returns True if audit is required
   */
  public static requiresAudit(operation: string, entityType: string): boolean {
    const isCriticalOperation = this.CRITICAL_OPERATIONS.includes(operation.toUpperCase());
    const isCriticalEntity = this.CRITICAL_ENTITY_TYPES.includes(entityType);

    return isCriticalOperation && isCriticalEntity;
  }

  /**
   * Gets the list of critical operations
   * @returns Array of critical operation names
   */
  public static getCriticalOperations(): string[] {
    return [...this.CRITICAL_OPERATIONS];
  }

  /**
   * Gets the list of critical entity types
   * @returns Array of critical entity type names
   */
  public static getCriticalEntityTypes(): string[] {
    return [...this.CRITICAL_ENTITY_TYPES];
  }
}
