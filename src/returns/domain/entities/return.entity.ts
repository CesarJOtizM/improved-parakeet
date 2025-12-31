import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { ReturnCancelledEvent } from '@returns/domain/events/returnCancelled.event';
import { ReturnConfirmedEvent } from '@returns/domain/events/returnConfirmed.event';
import { ReturnCreatedEvent } from '@returns/domain/events/returnCreated.event';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';
import { Money } from '@stock/domain/valueObjects/money.valueObject';

export interface IReturnProps {
  returnNumber: ReturnNumber;
  status: ReturnStatus;
  type: ReturnType;
  reason: ReturnReason;
  warehouseId: string;
  saleId?: string; // For customer returns
  sourceMovementId?: string; // For supplier returns (purchase movement)
  returnMovementId?: string; // Generated movement (IN for customer, OUT for supplier)
  note?: string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  createdBy: string;
}

export class Return extends AggregateRoot<IReturnProps> {
  private lines: ReturnLine[] = [];

  private constructor(props: IReturnProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IReturnProps, orgId: string): Return {
    // Validate return type specific requirements
    if (props.type.isCustomerReturn() && !props.saleId) {
      throw new Error('Sale ID is required for customer returns');
    }
    if (props.type.isSupplierReturn() && !props.sourceMovementId) {
      throw new Error('Source movement ID is required for supplier returns');
    }

    const returnEntity = new Return(props, undefined, orgId);
    const event = new ReturnCreatedEvent(returnEntity);
    returnEntity.addDomainEvent(event);
    return returnEntity;
  }

  public static reconstitute(
    props: IReturnProps,
    id: string,
    orgId: string,
    lines: ReturnLine[] = []
  ): Return {
    const returnEntity = new Return(props, id, orgId);
    returnEntity.lines = lines;
    return returnEntity;
  }

  public addLine(line: ReturnLine): void {
    // Lines can only be added when status is DRAFT
    if (!this.props.status.isDraft()) {
      throw new Error('Lines can only be added when return status is DRAFT');
    }

    // Validate line consistency with return type
    if (this.props.type.isCustomerReturn() && !line.originalSalePrice) {
      throw new Error('Customer return lines must have original sale price');
    }
    if (this.props.type.isSupplierReturn() && !line.originalUnitCost) {
      throw new Error('Supplier return lines must have original unit cost');
    }

    // Validate line quantity is positive
    if (!line.quantity.isPositive()) {
      throw new Error('Line quantity must be positive');
    }

    this.lines.push(line);
    this.updateTimestamp();
  }

  public removeLine(lineId: string): void {
    // Lines can only be removed when status is DRAFT
    if (!this.props.status.isDraft()) {
      throw new Error('Lines can only be removed when return status is DRAFT');
    }

    const lineExists = this.lines.some(line => line.id === lineId);
    if (!lineExists) {
      throw new Error(`Line with id ${lineId} not found`);
    }

    this.lines = this.lines.filter(line => line.id !== lineId);
    this.updateTimestamp();
  }

  public confirm(returnMovementId: string): void {
    // Validate status can be confirmed
    if (!this.props.status.canConfirm()) {
      throw new Error('Return cannot be confirmed');
    }

    // Return must have at least one line before confirming
    if (this.lines.length === 0) {
      throw new Error('Return must have at least one line before confirming');
    }

    // All lines must have valid quantities (positive)
    for (const line of this.lines) {
      if (!line.quantity.isPositive()) {
        throw new Error('All lines must have positive quantities');
      }
    }

    this.props.status = ReturnStatus.create('CONFIRMED');
    this.props.confirmedAt = new Date();
    this.props.returnMovementId = returnMovementId;
    this.updateTimestamp();

    // Emit ReturnConfirmedEvent
    const event = new ReturnConfirmedEvent(this, returnMovementId);
    this.addDomainEvent(event);
  }

  public cancel(reason?: string): void {
    // Validate status can be cancelled
    if (!this.props.status.canCancel()) {
      throw new Error('Return cannot be cancelled');
    }

    // Cannot cancel a return that is already CANCELLED
    if (this.props.status.isCancelled()) {
      throw new Error('Return is already cancelled');
    }

    this.props.status = ReturnStatus.create('CANCELLED');
    this.props.cancelledAt = new Date();
    if (reason) {
      this.props.reason = ReturnReason.create(reason);
    }
    this.updateTimestamp();

    // Emit ReturnCancelledEvent
    const event = new ReturnCancelledEvent(this, reason);
    this.addDomainEvent(event);
  }

  public update(props: Partial<IReturnProps>): Return {
    // Cannot update return when status is CONFIRMED or CANCELLED
    if (this.props.status.isConfirmed() || this.props.status.isCancelled()) {
      throw new Error('Cannot update return when status is CONFIRMED or CANCELLED');
    }

    const updatedProps: IReturnProps = {
      returnNumber: this.props.returnNumber,
      status: this.props.status,
      type: this.props.type,
      reason: props.reason !== undefined ? props.reason : this.props.reason,
      warehouseId: this.props.warehouseId,
      saleId: this.props.saleId,
      sourceMovementId: this.props.sourceMovementId,
      returnMovementId: this.props.returnMovementId,
      note: props.note !== undefined ? props.note : this.props.note,
      confirmedAt: this.props.confirmedAt,
      cancelledAt: this.props.cancelledAt,
      createdBy: this.props.createdBy,
    };

    // Create new instance preserving lines
    return Return.reconstitute(updatedProps, this.id, this.orgId!, [...this.lines]);
  }

  public getTotalAmount(): Money | null {
    if (this.lines.length === 0) {
      return null;
    }

    let total: Money | null = null;
    for (const line of this.lines) {
      const lineTotal = line.getTotalPrice();
      if (lineTotal) {
        if (total === null) {
          total = lineTotal;
        } else {
          if (lineTotal.getCurrency() !== total.getCurrency()) {
            throw new Error('All lines must have the same currency');
          }
          total = total.add(lineTotal);
        }
      }
    }
    return total;
  }

  public getLines(): ReturnLine[] {
    return [...this.lines];
  }

  // Getters
  get returnNumber(): ReturnNumber {
    return this.props.returnNumber;
  }

  get status(): ReturnStatus {
    return this.props.status;
  }

  get type(): ReturnType {
    return this.props.type;
  }

  get reason(): ReturnReason {
    return this.props.reason;
  }

  get warehouseId(): string {
    return this.props.warehouseId;
  }

  get saleId(): string | undefined {
    return this.props.saleId;
  }

  get sourceMovementId(): string | undefined {
    return this.props.sourceMovementId;
  }

  get returnMovementId(): string | undefined {
    return this.props.returnMovementId;
  }

  get note(): string | undefined {
    return this.props.note;
  }

  get confirmedAt(): Date | undefined {
    return this.props.confirmedAt;
  }

  get cancelledAt(): Date | undefined {
    return this.props.cancelledAt;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }
}
