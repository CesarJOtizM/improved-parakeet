import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';
import { TransferInitiatedEvent } from '@transfer/domain/events/transferInitiated.event';
import { TransferReceivedEvent } from '@transfer/domain/events/transferReceived.event';
import { TransferRejectedEvent } from '@transfer/domain/events/transferRejected.event';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

export interface ITransferProps {
  fromWarehouseId: string;
  toWarehouseId: string;
  status: TransferStatus;
  createdBy: string;
  note?: string;
  initiatedAt?: Date;
  receivedAt?: Date;
}

export class Transfer extends AggregateRoot<ITransferProps> {
  private _lines: TransferLine[] = [];

  private constructor(props: ITransferProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: ITransferProps, orgId: string): Transfer {
    // Validate that fromWarehouseId and toWarehouseId are different
    if (props.fromWarehouseId === props.toWarehouseId) {
      throw new Error('From warehouse and to warehouse must be different');
    }

    const transfer = new Transfer(props, undefined, orgId);
    return transfer;
  }

  public static reconstitute(
    props: ITransferProps,
    id: string,
    orgId: string,
    lines: TransferLine[] = []
  ): Transfer {
    const transfer = new Transfer(props, id, orgId);
    transfer._lines = lines;
    return transfer;
  }

  /**
   * Checks if lines can be added to this transfer
   */
  public canAddLine(): boolean {
    return this.props.status.isDraft();
  }

  /**
   * Checks if lines can be removed from this transfer
   */
  public canRemoveLine(): boolean {
    return this.props.status.isDraft();
  }

  /**
   * Checks if the transfer can be confirmed
   */
  public canConfirm(): boolean {
    if (!this.props.status.canConfirm()) {
      return false;
    }
    // Transfer must have at least one line before confirmation
    if (this._lines.length === 0) {
      return false;
    }
    // All lines must have valid quantities (positive)
    for (const line of this._lines) {
      if (!line.quantity.isPositive()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if the transfer can be updated
   */
  public canUpdate(): boolean {
    return (
      !this.props.status.isReceived() &&
      !this.props.status.isRejected() &&
      !this.props.status.isCanceled()
    );
  }

  public addLine(line: TransferLine): void {
    if (!this.canAddLine()) {
      throw new Error('Lines can only be added when transfer status is DRAFT');
    }

    // Validate line consistency (TransferLine.create already validates, but ensure it's valid)
    if (!line.quantity.isPositive()) {
      throw new Error('Line quantity must be positive');
    }

    this._lines.push(line);
    this.updateTimestamp();
  }

  public removeLine(lineId: string): void {
    if (!this.canRemoveLine()) {
      throw new Error('Lines can only be removed when transfer status is DRAFT');
    }

    const lineExists = this._lines.some(line => line.id === lineId);
    if (!lineExists) {
      throw new Error(`Line with id ${lineId} not found`);
    }

    this._lines = this._lines.filter(line => line.id !== lineId);
    this.updateTimestamp();
  }

  public confirm(): void {
    if (!this.canConfirm()) {
      if (!this.props.status.canConfirm()) {
        throw new Error('Transfer cannot be confirmed');
      }
      if (this._lines.length === 0) {
        throw new Error('Transfer must have at least one line before confirmation');
      }
      throw new Error('All lines must have positive quantities');
    }

    this.props.status = TransferStatus.create('IN_TRANSIT');
    this.props.initiatedAt = new Date();
    this.updateTimestamp();

    // Emit TransferInitiatedEvent
    const event = new TransferInitiatedEvent(this);
    this.addDomainEvent(event);
  }

  public receive(): void {
    // Validate status can be received
    if (!this.props.status.canReceive()) {
      throw new Error('Transfer cannot be received');
    }

    this.props.status = TransferStatus.create('RECEIVED');
    this.props.receivedAt = new Date();
    this.updateTimestamp();

    // Emit TransferReceivedEvent
    const event = new TransferReceivedEvent(this);
    this.addDomainEvent(event);
  }

  public receivePartial(): void {
    if (!this.props.status.canReceive()) {
      throw new Error('Transfer cannot be partially received');
    }

    this.props.status = TransferStatus.create('PARTIAL');
    this.updateTimestamp();
  }

  public reject(rejectionReason?: string): void {
    // Validate status can be rejected
    if (!this.props.status.canReject()) {
      throw new Error('Transfer cannot be rejected');
    }

    this.props.status = TransferStatus.create('REJECTED');
    this.updateTimestamp();

    // Emit TransferRejectedEvent
    const event = new TransferRejectedEvent(this, rejectionReason);
    this.addDomainEvent(event);
  }

  public cancel(): void {
    if (!this.props.status.canCancel()) {
      throw new Error('Transfer cannot be canceled');
    }

    this.props.status = TransferStatus.create('CANCELED');
    this.updateTimestamp();
  }

  public update(props: Partial<ITransferProps>): Transfer {
    if (!this.canUpdate()) {
      throw new Error('Cannot update transfer when status is RECEIVED, REJECTED, or CANCELED');
    }

    const updatedProps: ITransferProps = {
      fromWarehouseId: this.props.fromWarehouseId,
      toWarehouseId: this.props.toWarehouseId,
      status: this.props.status,
      createdBy: this.props.createdBy,
      note: props.note !== undefined ? props.note : this.props.note,
      initiatedAt: this.props.initiatedAt,
      receivedAt: this.props.receivedAt,
    };

    // Create new instance preserving lines
    return Transfer.reconstitute(updatedProps, this.id, this.orgId!, [...this._lines]);
  }

  public getTotalQuantity(): number {
    return this._lines.reduce((total, line) => total + line.quantity.getNumericValue(), 0);
  }

  public getLines(): TransferLine[] {
    return [...this._lines];
  }

  // Getters
  get fromWarehouseId(): string {
    return this.props.fromWarehouseId;
  }

  get toWarehouseId(): string {
    return this.props.toWarehouseId;
  }

  get status(): TransferStatus {
    return this.props.status;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get note(): string | undefined {
    return this.props.note;
  }

  get initiatedAt(): Date | undefined {
    return this.props.initiatedAt;
  }

  get receivedAt(): Date | undefined {
    return this.props.receivedAt;
  }
}
