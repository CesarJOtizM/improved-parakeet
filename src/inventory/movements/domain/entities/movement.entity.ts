import { MovementLine, MovementStatus, MovementType } from '@inventory/movements';
import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

export interface MovementProps {
  type: MovementType;
  status: MovementStatus;
  warehouseId: string;
  reference?: string;
  reason?: string;
  note?: string;
  postedAt?: Date;
  createdBy: string;
}

export class Movement extends AggregateRoot<MovementProps> {
  private lines: MovementLine[] = [];

  private constructor(props: MovementProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: MovementProps, orgId: string): Movement {
    const movement = new Movement(props, undefined, orgId);
    return movement;
  }

  public static reconstitute(props: MovementProps, id: string, orgId: string): Movement {
    return new Movement(props, id, orgId);
  }

  public addLine(line: MovementLine): void {
    this.lines.push(line);
    this.updateTimestamp();
  }

  public removeLine(lineId: string): void {
    this.lines = this.lines.filter(line => line.id !== lineId);
    this.updateTimestamp();
  }

  public post(): void {
    if (!this.props.status.canPost()) {
      throw new Error('Movement cannot be posted');
    }

    this.props.status = MovementStatus.create('POSTED');
    this.props.postedAt = new Date();
    this.updateTimestamp();
  }

  public void(): void {
    if (!this.props.status.canVoid()) {
      throw new Error('Movement cannot be voided');
    }

    this.props.status = MovementStatus.create('VOID');
    this.updateTimestamp();
  }

  public update(props: Partial<MovementProps>): void {
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
