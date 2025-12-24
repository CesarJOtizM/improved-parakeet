/**
 * Base factory utilities for test factories
 */
export class BaseFactory {
  /**
   * Generates a unique test ID
   */
  static generateId(): string {
    return `test-id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generates a unique organization ID for testing
   */
  static generateOrgId(): string {
    return `test-org-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Creates an array of entities using a factory function
   */
  static createMany<T>(count: number, factoryFn: (index: number) => T): T[] {
    return Array.from({ length: count }, (_, index) => factoryFn(index));
  }
}
