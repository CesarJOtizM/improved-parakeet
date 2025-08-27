import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

export interface TransferProps {
  fromWarehouseId: string;
  toWarehouseId: string;
  status: TransferStatus;
  createdBy: string;
  note?: string;
}

export class Transfer extends AggregateRoot<TransferProps> {
  private _lines: TransferLine[] = [];

  private constructor(props: TransferProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: TransferProps, orgId: string): Transfer {
    const transfer = new Transfer(props, undefined, orgId);
    return transfer;
  }

  public static reconstitute(props: TransferProps, id: string, orgId: string): Transfer {
    return new Transfer(props, id, orgId);
  }

  public addLine(line: TransferLine): void {
    this._lines.push(line);
    this.updateTimestamp();
  }

  public removeLine(lineId: string): void {
    this._lines = this._lines.filter(line => line.id !== lineId);
    this.updateTimestamp();
  }

  public confirm(): void {
    if (!this.props.status.canConfirm()) {
      throw new Error('Transfer cannot be confirmed');
    }

    this.props.status = TransferStatus.create('IN_TRANSIT');
    this.updateTimestamp();
  }

  public receive(): void {
    if (!this.props.status.canReceive()) {
      throw new Error('Transfer cannot be received');
    }

    this.props.status = TransferStatus.create('RECEIVED');
    this.updateTimestamp();
  }

  public receivePartial(): void {
    if (!this.props.status.canReceive()) {
      throw new Error('Transfer cannot be partially received');
    }

    this.props.status = TransferStatus.create('PARTIAL');
    this.updateTimestamp();
  }

  public reject(): void {
    if (!this.props.status.canReject()) {
      throw new Error('Transfer cannot be rejected');
    }

    this.props.status = TransferStatus.create('REJECTED');
    this.updateTimestamp();
  }

  public cancel(): void {
    if (!this.props.status.canCancel()) {
      throw new Error('Transfer cannot be canceled');
    }

    this.props.status = TransferStatus.create('CANCELED');
    this.updateTimestamp();
  }

  public update(props: Partial<TransferProps>): void {
    if (props.note !== undefined) this.props.note = props.note;

    this.updateTimestamp();
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
}
