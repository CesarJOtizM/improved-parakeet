import { ValueObject } from '@shared/domain/base/valueObject.base';

export type TransferDirectionValue = 'OUTBOUND' | 'INBOUND';

export class TransferDirection extends ValueObject<{ value: TransferDirectionValue }> {
  constructor(value: TransferDirectionValue) {
    super({ value });
  }

  public static create(value: TransferDirectionValue): TransferDirection {
    if (!this.isValid(value)) {
      throw new Error(`Invalid transfer direction: ${value}`);
    }
    return new TransferDirection(value);
  }

  private static isValid(value: string): value is TransferDirectionValue {
    return ['OUTBOUND', 'INBOUND'].includes(value);
  }

  public isOutbound(): boolean {
    return this.props.value === 'OUTBOUND';
  }

  public isInbound(): boolean {
    return this.props.value === 'INBOUND';
  }

  public getValue(): TransferDirectionValue {
    return this.props.value;
  }
}
