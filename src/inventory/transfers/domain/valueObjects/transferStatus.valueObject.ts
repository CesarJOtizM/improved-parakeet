import { ValueObject } from '@shared/domain/base/valueObject.base';

export type TransferStatusValue =
  | 'DRAFT'
  | 'IN_TRANSIT'
  | 'PARTIAL'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELED';

export class TransferStatus extends ValueObject<{ value: TransferStatusValue }> {
  constructor(value: TransferStatusValue) {
    super({ value });
  }

  public static create(value: TransferStatusValue): TransferStatus {
    if (!this.isValid(value)) {
      throw new Error(`Invalid transfer status: ${value}`);
    }
    return new TransferStatus(value);
  }

  private static isValid(value: string): value is TransferStatusValue {
    return ['DRAFT', 'IN_TRANSIT', 'PARTIAL', 'RECEIVED', 'REJECTED', 'CANCELED'].includes(value);
  }

  public isDraft(): boolean {
    return this.props.value === 'DRAFT';
  }

  public isInTransit(): boolean {
    return this.props.value === 'IN_TRANSIT';
  }

  public isPartial(): boolean {
    return this.props.value === 'PARTIAL';
  }

  public isReceived(): boolean {
    return this.props.value === 'RECEIVED';
  }

  public isRejected(): boolean {
    return this.props.value === 'REJECTED';
  }

  public isCanceled(): boolean {
    return this.props.value === 'CANCELED';
  }

  public canConfirm(): boolean {
    return ['DRAFT', 'IN_TRANSIT'].includes(this.props.value);
  }

  public canReceive(): boolean {
    return ['IN_TRANSIT', 'PARTIAL'].includes(this.props.value);
  }

  public canReject(): boolean {
    return ['IN_TRANSIT', 'PARTIAL'].includes(this.props.value);
  }

  public canCancel(): boolean {
    return ['DRAFT', 'IN_TRANSIT'].includes(this.props.value);
  }

  public getValue(): TransferStatusValue {
    return this.props.value;
  }
}
