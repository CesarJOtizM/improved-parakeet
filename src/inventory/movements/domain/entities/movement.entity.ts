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

  public static reconstitute(
    props: IMovementProps,
    id: string,
    orgId: string,
    lines: MovementLine[] = []
  ): Movement {
    const movement = new Movement(props, id, orgId);
    movement.lines = lines;
    return movement;
  }

  /**
   * Checks if lines can be added to this movement
   */
  public canAddLine(): boolean {
    return this.props.status.isDraft();
  }

  /**
   * Checks if lines can be removed from this movement
   */
  public canRemoveLine(): boolean {
    return this.props.status.isDraft();
  }

  /**
   * Checks if the movement can be posted
   */
  public canPost(): boolean {
    if (!this.props.status.canPost()) {
      return false;
    }
    // Movement must have at least one line before posting
    if (this.lines.length === 0) {
      return false;
    }
    // All lines must have valid quantities (positive)
    for (const line of this.lines) {
      if (!line.quantity.isPositive()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if the movement can be updated
   */
  public canUpdate(): boolean {
    return !this.props.status.isPosted() && !this.props.status.isVoid();
  }

  public addLine(line: MovementLine): void {
    if (!this.canAddLine()) {
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
    if (!this.canRemoveLine()) {
      throw new Error('Lines can only be removed when movement status is DRAFT');
    }

    const lineExists = this.lines.some(line => line.id === lineId);
    if (!lineExists) {
      throw new Error(`Line with id ${lineId} not found`);
    }

    this.lines = this.lines.filter(line => line.id !== lineId);
    this.updateTimestamp();
  }

  public post(): Movement {
    if (!this.canPost()) {
      if (!this.props.status.canPost()) {
        throw new Error('Movement cannot be posted');
      }
      if (this.lines.length === 0) {
        throw new Error('Movement must have at least one line before posting');
      }
      throw new Error('All lines must have positive quantities');
    }

    const updatedProps: IMovementProps = {
      ...this.props,
      status: MovementStatus.create('POSTED'),
      postedAt: new Date(),
    };

    // Create new instance preserving lines
    const postedMovement = Movement.reconstitute(updatedProps, this.id, this.orgId!, [
      ...this.lines,
    ]);
    const event = new MovementPostedEvent(postedMovement);
    postedMovement.addDomainEvent(event);
    return postedMovement;
  }

  public void(): Movement {
    // Validate status can be voided
    if (!this.props.status.canVoid()) {
      throw new Error('Movement cannot be voided');
    }

    // Cannot void a movement that is already VOID
    if (this.props.status.isVoid()) {
      throw new Error('Movement is already voided');
    }

    const updatedProps: IMovementProps = {
      ...this.props,
      status: MovementStatus.create('VOID'),
    };

    // Create new instance preserving lines
    const voidedMovement = Movement.reconstitute(updatedProps, this.id, this.orgId!, [
      ...this.lines,
    ]);
    const event = new MovementVoidedEvent(voidedMovement);
    voidedMovement.addDomainEvent(event);
    return voidedMovement;
  }

  public update(props: Partial<IMovementProps>): Movement {
    if (!this.canUpdate()) {
      throw new Error('Cannot update movement when status is POSTED or VOID');
    }

    const updatedProps: IMovementProps = {
      type: this.props.type,
      status: this.props.status,
      warehouseId: this.props.warehouseId,
      reference: props.reference !== undefined ? props.reference : this.props.reference,
      reason: props.reason !== undefined ? props.reason : this.props.reason,
      note: props.note !== undefined ? props.note : this.props.note,
      postedAt: this.props.postedAt,
      createdBy: this.props.createdBy,
    };

    // Create new instance preserving lines
    return Movement.reconstitute(updatedProps, this.id, this.orgId!, [...this.lines]);
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
