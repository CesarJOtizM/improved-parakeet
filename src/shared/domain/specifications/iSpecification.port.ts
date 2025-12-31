/**
 * Specification Pattern - Domain Interface
 *
 * The Specification Pattern encapsulates business rules that can be combined
 * using boolean logic (AND, OR, NOT) to create complex queries.
 *
 * This interface defines the contract for specifications that can evaluate
 * whether an entity satisfies certain criteria.
 */
export interface ISpecification<T> {
  /**
   * Evaluates whether the given entity satisfies this specification
   * @param entity The entity to evaluate
   * @returns true if the entity satisfies the specification, false otherwise
   */
  isSatisfiedBy(entity: T): boolean;

  /**
   * Combines this specification with another using AND logic
   * @param spec The other specification
   * @returns A new composite specification
   */
  and(spec: ISpecification<T>): ISpecification<T>;

  /**
   * Combines this specification with another using OR logic
   * @param spec The other specification
   * @returns A new composite specification
   */
  or(spec: ISpecification<T>): ISpecification<T>;

  /**
   * Negates this specification using NOT logic
   * @returns A new negated specification
   */
  not(): ISpecification<T>;
}
