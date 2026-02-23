import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SaleCancelledEvent } from '@sale/domain/events/saleCancelled.event';
import { SaleConfirmedEvent } from '@sale/domain/events/saleConfirmed.event';
import { SaleCreatedEvent } from '@sale/domain/events/saleCreated.event';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';
import { Money } from '@stock/domain/valueObjects/money.valueObject';

export interface ISaleProps {
  saleNumber: SaleNumber;
  status: SaleStatus;
  warehouseId: string;
  customerReference?: string;
  externalReference?: string;
  note?: string;
  confirmedAt?: Date;
  confirmedBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdBy: string;
  movementId?: string;
}

export class Sale extends AggregateRoot<ISaleProps> {
  private lines: SaleLine[] = [];

  private constructor(props: ISaleProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: ISaleProps, orgId: string): Sale {
    const sale = new Sale(props, undefined, orgId);
    const event = new SaleCreatedEvent(sale);
    sale.addDomainEvent(event);
    return sale;
  }

  public static reconstitute(
    props: ISaleProps,
    id: string,
    orgId: string,
    lines: SaleLine[] = []
  ): Sale {
    const sale = new Sale(props, id, orgId);
    sale.lines = lines;
    return sale;
  }

  public addLine(line: SaleLine): void {
    // Lines can only be added when status is DRAFT
    if (!this.props.status.isDraft()) {
      throw new Error('Lines can only be added when sale status is DRAFT');
    }

    // Validate line consistency
    if (!line.quantity.isPositive()) {
      throw new Error('Line quantity must be positive');
    }

    this.lines.push(line);
    this.updateTimestamp();
  }

  public removeLine(lineId: string): void {
    // Lines can only be removed when status is DRAFT
    if (!this.props.status.isDraft()) {
      throw new Error('Lines can only be removed when sale status is DRAFT');
    }

    const lineExists = this.lines.some(line => line.id === lineId);
    if (!lineExists) {
      throw new Error(`Line with id ${lineId} not found`);
    }

    this.lines = this.lines.filter(line => line.id !== lineId);
    this.updateTimestamp();
  }

  public confirm(movementId: string, confirmedBy?: string): void {
    // Validate status can be confirmed
    if (!this.props.status.canConfirm()) {
      throw new Error('Sale cannot be confirmed');
    }

    // Sale must have at least one line before confirming
    if (this.lines.length === 0) {
      throw new Error('Sale must have at least one line before confirming');
    }

    // All lines must have valid quantities (positive)
    for (const line of this.lines) {
      if (!line.quantity.isPositive()) {
        throw new Error('All lines must have positive quantities');
      }
    }

    this.props.status = SaleStatus.create('CONFIRMED');
    this.props.confirmedAt = new Date();
    this.props.confirmedBy = confirmedBy;
    this.props.movementId = movementId;
    this.updateTimestamp();

    // Emit SaleConfirmedEvent
    const event = new SaleConfirmedEvent(this, movementId);
    this.addDomainEvent(event);
  }

  public cancel(reason?: string, cancelledBy?: string): void {
    // Validate status can be cancelled
    if (!this.props.status.canCancel()) {
      throw new Error('Sale cannot be cancelled');
    }

    // Cannot cancel a sale that is already CANCELLED
    if (this.props.status.isCancelled()) {
      throw new Error('Sale is already cancelled');
    }

    this.props.status = SaleStatus.create('CANCELLED');
    this.props.cancelledAt = new Date();
    this.props.cancelledBy = cancelledBy;
    this.updateTimestamp();

    // Emit SaleCancelledEvent
    const event = new SaleCancelledEvent(this, reason);
    this.addDomainEvent(event);
  }

  public update(props: Partial<ISaleProps>): Sale {
    // Cannot update sale when status is CONFIRMED or CANCELLED
    if (this.props.status.isConfirmed() || this.props.status.isCancelled()) {
      throw new Error('Cannot update sale when status is CONFIRMED or CANCELLED');
    }

    const updatedProps: ISaleProps = {
      saleNumber: this.props.saleNumber,
      status: this.props.status,
      warehouseId: this.props.warehouseId,
      customerReference:
        props.customerReference !== undefined
          ? props.customerReference
          : this.props.customerReference,
      externalReference:
        props.externalReference !== undefined
          ? props.externalReference
          : this.props.externalReference,
      note: props.note !== undefined ? props.note : this.props.note,
      confirmedAt: this.props.confirmedAt,
      confirmedBy: this.props.confirmedBy,
      cancelledAt: this.props.cancelledAt,
      cancelledBy: this.props.cancelledBy,
      createdBy: this.props.createdBy,
      movementId: this.props.movementId,
    };

    // Create new instance preserving lines
    return Sale.reconstitute(updatedProps, this.id, this.orgId!, [...this.lines]);
  }

  public getTotalAmount(): Money {
    if (this.lines.length === 0) {
      return Money.create(0, 'COP', 2);
    }

    let total = Money.create(0, this.lines[0].salePrice.getCurrency(), 2);
    for (const line of this.lines) {
      const lineTotal = line.getTotalPrice();
      if (lineTotal.getCurrency() !== total.getCurrency()) {
        throw new Error('All lines must have the same currency');
      }
      total = total.add(lineTotal);
    }
    return total;
  }

  public getLines(): SaleLine[] {
    return [...this.lines];
  }

  // Getters
  get saleNumber(): SaleNumber {
    return this.props.saleNumber;
  }

  get status(): SaleStatus {
    return this.props.status;
  }

  get warehouseId(): string {
    return this.props.warehouseId;
  }

  get customerReference(): string | undefined {
    return this.props.customerReference;
  }

  get externalReference(): string | undefined {
    return this.props.externalReference;
  }

  get note(): string | undefined {
    return this.props.note;
  }

  get confirmedAt(): Date | undefined {
    return this.props.confirmedAt;
  }

  get confirmedBy(): string | undefined {
    return this.props.confirmedBy;
  }

  get cancelledAt(): Date | undefined {
    return this.props.cancelledAt;
  }

  get cancelledBy(): string | undefined {
    return this.props.cancelledBy;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get movementId(): string | undefined {
    return this.props.movementId;
  }
}
