import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IAuditMetadataProps {
  value: Record<string, unknown>;
}

export class AuditMetadata extends ValueObject<IAuditMetadataProps> {
  private constructor(props: IAuditMetadataProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: Record<string, unknown>): AuditMetadata {
    if (value === null || value === undefined) {
      throw new Error('Audit metadata must be an object');
    }
    return new AuditMetadata({ value });
  }

  public static empty(): AuditMetadata {
    return new AuditMetadata({ value: {} });
  }

  private validate(props: IAuditMetadataProps): void {
    if (!props.value || typeof props.value !== 'object') {
      throw new Error('Audit metadata must be an object');
    }

    // Check for circular references by attempting JSON serialization
    try {
      JSON.stringify(props.value);
    } catch (_error) {
      throw new Error('Audit metadata contains circular references or invalid values');
    }
  }

  public getValue(): Record<string, unknown> {
    return this.props.value;
  }

  public toJSON(): Record<string, unknown> {
    return this.props.value;
  }

  public equals(other?: AuditMetadata): boolean {
    if (!other) {
      return false;
    }
    return JSON.stringify(this.props.value) === JSON.stringify(other.props.value);
  }

  public isEmpty(): boolean {
    return Object.keys(this.props.value).length === 0;
  }

  public merge(other: AuditMetadata): AuditMetadata {
    return AuditMetadata.create({
      ...this.props.value,
      ...other.props.value,
    });
  }
}
