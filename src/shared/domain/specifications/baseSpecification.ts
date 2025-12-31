import { ISpecification } from './iSpecification.port';

/**
 * Base abstract class for specifications
 * Provides default implementations for composite operations (AND, OR, NOT)
 */
export abstract class BaseSpecification<T> implements ISpecification<T> {
  /**
   * Evaluates whether the given entity satisfies this specification
   * Must be implemented by concrete specifications
   */
  public abstract isSatisfiedBy(entity: T): boolean;

  /**
   * Combines this specification with another using AND logic
   */
  public and(spec: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, spec);
  }

  /**
   * Combines this specification with another using OR logic
   */
  public or(spec: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, spec);
  }

  /**
   * Negates this specification using NOT logic
   */
  public not(): ISpecification<T> {
    return new NotSpecification(this);
  }
}

/**
 * Composite specification that combines two specifications with AND logic
 */
export class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly spec1: ISpecification<T>,
    private readonly spec2: ISpecification<T>
  ) {
    super();
  }

  public isSatisfiedBy(entity: T): boolean {
    return this.spec1.isSatisfiedBy(entity) && this.spec2.isSatisfiedBy(entity);
  }
}

/**
 * Composite specification that combines two specifications with OR logic
 */
export class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly spec1: ISpecification<T>,
    private readonly spec2: ISpecification<T>
  ) {
    super();
  }

  public isSatisfiedBy(entity: T): boolean {
    return this.spec1.isSatisfiedBy(entity) || this.spec2.isSatisfiedBy(entity);
  }
}

/**
 * Composite specification that negates another specification
 */
export class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly spec: ISpecification<T>) {
    super();
  }

  public isSatisfiedBy(entity: T): boolean {
    return !this.spec.isSatisfiedBy(entity);
  }
}
