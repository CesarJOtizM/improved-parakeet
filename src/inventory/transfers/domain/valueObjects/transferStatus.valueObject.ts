import { ValueObject } from '@shared/domain/base/valueObject.base';

export type TransferStatusValue =
  | 'DRAFT'
  | 'IN_TRANSIT'
  | 'PARTIAL'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELED';

export class TransferStatus extends ValueObject<TransferStatusValue> {
  constructor(value: TransferStatusValue) {
    super(value);
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
    return this.props === 'DRAFT';
  }

  public isInTransit(): boolean {
    return this.props === 'IN_TRANSIT';
  }

  public isPartial(): boolean {
    return this.props === 'PARTIAL';
  }

  public isReceived(): boolean {
    return this.props === 'RECEIVED';
  }

  public isRejected(): boolean {
    return this.props === 'REJECTED';
  }

  public isCanceled(): boolean {
    return this.props === 'CANCELED';
  }

  public canConfirm(): boolean {
    return ['DRAFT', 'IN_TRANSIT'].includes(this.props);
  }

  public canReceive(): boolean {
    return ['IN_TRANSIT', 'PARTIAL'].includes(this.props);
  }

  public canReject(): boolean {
    return ['IN_TRANSIT', 'PARTIAL'].includes(this.props);
  }

  public canCancel(): boolean {
    return ['DRAFT', 'IN_TRANSIT'].includes(this.props);
  }

  public getValue(): TransferStatusValue {
    return this.props;
  }
}
