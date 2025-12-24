import { DomainEvent } from '@shared/domain/events/domainEvent.base';
import { Transfer } from '@transfer/domain/entities/transfer.entity';

export class TransferRejectedEvent extends DomainEvent {
  constructor(
    private readonly transfer: Transfer,
    private readonly _rejectionReason?: string
  ) {
    super();
  }

  get eventName(): string {
    return 'TransferRejected';
  }

  get occurredOn(): Date {
    return new Date();
  }

  get transferId(): string {
    return this.transfer.id;
  }

  get orgId(): string {
    return this.transfer.orgId;
  }

  get fromWarehouseId(): string {
    return this.transfer.fromWarehouseId;
  }

  get toWarehouseId(): string {
    return this.transfer.toWarehouseId;
  }

  get rejectionReason(): string | undefined {
    return this._rejectionReason;
  }
}
