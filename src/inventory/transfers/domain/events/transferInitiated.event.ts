import { DomainEvent } from '@shared/domain/events/domainEvent.base';
import { Transfer } from '@transfer/domain/entities/transfer.entity';

export class TransferInitiatedEvent extends DomainEvent {
  constructor(private readonly transfer: Transfer) {
    super();
  }

  get eventName(): string {
    return 'TransferInitiated';
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

  get totalQuantity(): number {
    return this.transfer.getTotalQuantity();
  }

  get lines(): number {
    return this.transfer.getLines().length;
  }
}
