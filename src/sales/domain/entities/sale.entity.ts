import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SaleCancelledEvent } from '@sale/domain/events/saleCancelled.event';
import { SaleConfirmedEvent } from '@sale/domain/events/saleConfirmed.event';
import { SaleCreatedEvent } from '@sale/domain/events/saleCreated.event';
import { SalePickingStartedEvent } from '@sale/domain/events/salePickingStarted.event';
import { SaleCompletedEvent } from '@sale/domain/events/saleCompleted.event';
import { SaleReturnedEvent } from '@sale/domain/events/saleReturned.event';
import {
  SaleLineSwappedEvent,
  ISaleLineSwappedEventProps,
} from '@sale/domain/events/saleLineSwapped.event';
import { SaleShippedEvent } from '@sale/domain/events/saleShipped.event';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

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
  pickedAt?: Date;
  pickedBy?: string;
  shippedAt?: Date;
  shippedBy?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  shippingNotes?: string;
  completedAt?: Date;
  completedBy?: string;
  returnedAt?: Date;
  returnedBy?: string;
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

  public startPicking(userId?: string): void {
    if (!this.props.status.canStartPicking()) {
      throw new Error('Sale cannot start picking from current status');
    }

    this.props.status = SaleStatus.create('PICKING');
    this.props.pickedAt = new Date();
    this.props.pickedBy = userId;
    this.updateTimestamp();

    this.addDomainEvent(new SalePickingStartedEvent(this));
  }

  public ship(trackingNumber?: string, carrier?: string, notes?: string, userId?: string): void {
    if (!this.props.status.canShip()) {
      throw new Error('Sale cannot be shipped from current status');
    }

    this.props.status = SaleStatus.create('SHIPPED');
    this.props.shippedAt = new Date();
    this.props.shippedBy = userId;
    this.props.trackingNumber = trackingNumber;
    this.props.shippingCarrier = carrier;
    this.props.shippingNotes = notes;
    this.updateTimestamp();

    this.addDomainEvent(new SaleShippedEvent(this));
  }

  public complete(userId?: string): void {
    if (!this.props.status.canComplete()) {
      throw new Error('Sale cannot be completed from current status');
    }

    this.props.status = SaleStatus.create('COMPLETED');
    this.props.completedAt = new Date();
    this.props.completedBy = userId;
    this.updateTimestamp();

    this.addDomainEvent(new SaleCompletedEvent(this));
  }

  public markAsReturned(userId?: string): void {
    if (!this.props.status.canReturn()) {
      throw new Error('Sale cannot be marked as returned from current status');
    }

    this.props.status = SaleStatus.create('RETURNED');
    this.props.returnedAt = new Date();
    this.props.returnedBy = userId;
    this.updateTimestamp();

    this.addDomainEvent(new SaleReturnedEvent(this));
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

  public swapLine(
    originalLineId: string,
    replacementLine: SaleLine,
    swapQuantity: number
  ): { isPartial: boolean; newLineId?: string } {
    if (!this.props.status.canSwapLine()) {
      throw new Error('Sale line swap is only allowed in CONFIRMED or PICKING status');
    }

    const originalLine = this.lines.find(l => l.id === originalLineId);
    if (!originalLine) {
      throw new Error(`Line with id ${originalLineId} not found`);
    }

    if (swapQuantity <= 0) {
      throw new Error('Swap quantity must be positive');
    }

    const originalQty = originalLine.quantity.getNumericValue();
    if (swapQuantity > originalQty) {
      throw new Error(`Swap quantity ${swapQuantity} exceeds line quantity ${originalQty}`);
    }

    const isPartial = swapQuantity < originalQty;

    if (isPartial) {
      // Partial swap: reduce original line quantity, add new line
      const remainingQty = originalQty - swapQuantity;
      originalLine.update({
        quantity: Quantity.create(remainingQty),
      });
      this.lines.push(replacementLine);
      this.updateTimestamp();
      return { isPartial: true, newLineId: replacementLine.id };
    } else {
      // Full swap: replace the line's product and price in-place
      originalLine.update({
        quantity: replacementLine.quantity,
        salePrice: replacementLine.salePrice,
      });
      // Note: productId change is handled at DB level since entity doesn't expose setter
      this.updateTimestamp();
      return { isPartial: false };
    }
  }

  public emitSwapEvent(props: ISaleLineSwappedEventProps): void {
    const event = new SaleLineSwappedEvent(props);
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
      pickedAt: this.props.pickedAt,
      pickedBy: this.props.pickedBy,
      shippedAt: this.props.shippedAt,
      shippedBy: this.props.shippedBy,
      trackingNumber: this.props.trackingNumber,
      shippingCarrier: this.props.shippingCarrier,
      shippingNotes: this.props.shippingNotes,
      completedAt: this.props.completedAt,
      completedBy: this.props.completedBy,
      returnedAt: this.props.returnedAt,
      returnedBy: this.props.returnedBy,
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

  get pickedAt(): Date | undefined {
    return this.props.pickedAt;
  }

  get pickedBy(): string | undefined {
    return this.props.pickedBy;
  }

  get shippedAt(): Date | undefined {
    return this.props.shippedAt;
  }

  get shippedBy(): string | undefined {
    return this.props.shippedBy;
  }

  get trackingNumber(): string | undefined {
    return this.props.trackingNumber;
  }

  get shippingCarrier(): string | undefined {
    return this.props.shippingCarrier;
  }

  get shippingNotes(): string | undefined {
    return this.props.shippingNotes;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get completedBy(): string | undefined {
    return this.props.completedBy;
  }

  get returnedAt(): Date | undefined {
    return this.props.returnedAt;
  }

  get returnedBy(): string | undefined {
    return this.props.returnedBy;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get movementId(): string | undefined {
    return this.props.movementId;
  }
}
