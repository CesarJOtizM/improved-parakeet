import { DomainEvent } from '@shared/domain/events/domainEvent.base';

import { Movement } from '../entities/movement.entity';

export class MovementPostedEvent extends DomainEvent {
  constructor(private readonly movement: Movement) {
    super();
  }

  get eventName(): string {
    return 'MovementPosted';
  }

  get occurredOn(): Date {
    return this.movement.createdAt;
  }

  get movementId(): string {
    return this.movement.id;
  }

  get orgId(): string {
    return this.movement.orgId;
  }

  get type(): string {
    return this.movement.type.getValue();
  }

  get warehouseId(): string {
    return this.movement.warehouseId;
  }

  get totalQuantity(): number {
    return this.movement.getTotalQuantity();
  }

  get lines(): number {
    return this.movement.getLines().length;
  }
}
