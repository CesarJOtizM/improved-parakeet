import { MovementLine, MovementStatus, MovementType } from '@inventory/movements';
import { MovementPostedEvent } from '@movement/domain/events/movementPosted.event';
import { MovementVoidedEvent } from '@movement/domain/events/movementVoided.event';
import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

export interface IMovementProps {
  type: MovementType;
  status: MovementStatus;
  warehouseId: string;
  reference?: string;
  reason?: string;
  note?: string;
  postedAt?: Date;
  createdBy: string;
}

export class Movement extends AggregateRoot<IMovementProps> {
  private lines: MovementLine[] = [];

  private constructor(props: IMovementProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IMovementProps, orgId: string): Movement {
    const movement = new Movement(props, undefined, orgId);
    return movement;
  }

  public static reconstitute(props: IMovementProps, id: string, orgId: string): Movement {
    return new Movement(props, id, orgId);
  }

  public addLine(line: MovementLine): void {
    // Lines can only be added when status is DRAFT
    if (!this.props.status.isDraft()) {
      throw new Error('Lines can only be added when movement status is DRAFT');
    }

    // Validate line consistency (MovementLine.create already validates, but ensure it's valid)
    if (!line.quantity.isPositive()) {
      throw new Error('Line quantity must be positive');
    }

    this.lines.push(line);
    this.updateTimestamp();
  }

  public removeLine(lineId: string): void {
    // Lines can only be removed when status is DRAFT
    if (!this.props.status.isDraft()) {
      throw new Error('Lines can only be removed when movement status is DRAFT');
    }

    const lineExists = this.lines.some(line => line.id === lineId);
    if (!lineExists) {
      throw new Error(`Line with id ${lineId} not found`);
    }

    this.lines = this.lines.filter(line => line.id !== lineId);
    this.updateTimestamp();
  }

  public post(): void {
    // Validate status can be posted
    if (!this.props.status.canPost()) {
      throw new Error('Movement cannot be posted');
    }

    // Movement must have at least one line before posting
    if (this.lines.length === 0) {
      throw new Error('Movement must have at least one line before posting');
    }

    // All lines must have valid quantities (positive)
    for (const line of this.lines) {
      if (!line.quantity.isPositive()) {
        throw new Error('All lines must have positive quantities');
      }
    }

    this.props.status = MovementStatus.create('POSTED');
    this.props.postedAt = new Date();
    this.updateTimestamp();

    // Emit MovementPostedEvent
    const event = new MovementPostedEvent(this);
    this.addDomainEvent(event);
  }

  public void(): void {
    // Validate status can be voided
    if (!this.props.status.canVoid()) {
      throw new Error('Movement cannot be voided');
    }

    // Cannot void a movement that is already VOID
    if (this.props.status.isVoid()) {
      throw new Error('Movement is already voided');
    }

    this.props.status = MovementStatus.create('VOID');
    this.updateTimestamp();

    // Emit MovementVoidedEvent
    const event = new MovementVoidedEvent(this);
    this.addDomainEvent(event);
  }

  public update(props: Partial<IMovementProps>): void {
    // Cannot update movement when status is POSTED or VOID
    if (this.props.status.isPosted() || this.props.status.isVoid()) {
      throw new Error('Cannot update movement when status is POSTED or VOID');
    }

    if (props.reference !== undefined) this.props.reference = props.reference;
    if (props.reason !== undefined) this.props.reason = props.reason;
    if (props.note !== undefined) this.props.note = props.note;

    this.updateTimestamp();
  }

  public getTotalQuantity(): number {
    return this.lines.reduce((total, line) => total + line.quantity.getNumericValue(), 0);
  }

  public getLines(): MovementLine[] {
    return [...this.lines];
  }

  // Getters
  get type(): MovementType {
    return this.props.type;
  }

  get status(): MovementStatus {
    return this.props.status;
  }

  get warehouseId(): string {
    return this.props.warehouseId;
  }

  get reference(): string | undefined {
    return this.props.reference;
  }

  get reason(): string | undefined {
    return this.props.reason;
  }

  get note(): string | undefined {
    return this.props.note;
  }

  get postedAt(): Date | undefined {
    return this.props.postedAt;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }
}
