import { Entity } from '@shared/domain/base/entity.base';

export type PricingStrategy = 'KEEP_ORIGINAL' | 'NEW_PRICE';

export interface ISaleLineSwapProps {
  saleId: string;
  originalLineId: string;
  newLineId?: string;
  originalProductId: string;
  originalQuantity: number;
  originalSalePrice: number;
  originalCurrency: string;
  replacementProductId: string;
  replacementQuantity: number;
  replacementSalePrice: number;
  replacementCurrency: string;
  originalWarehouseId: string;
  sourceWarehouseId: string;
  isCrossWarehouse: boolean;
  returnMovementId?: string;
  deductMovementId?: string;
  pricingStrategy: PricingStrategy;
  reason?: string;
  performedBy: string;
}

export class SaleLineSwap extends Entity<ISaleLineSwapProps> {
  private constructor(props: ISaleLineSwapProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: ISaleLineSwapProps, orgId: string): SaleLineSwap {
    if (!props.saleId) throw new Error('Sale ID is required');
    if (!props.originalLineId) throw new Error('Original line ID is required');
    if (!props.originalProductId) throw new Error('Original product ID is required');
    if (!props.replacementProductId) throw new Error('Replacement product ID is required');
    if (props.replacementQuantity <= 0) throw new Error('Replacement quantity must be positive');
    if (!props.performedBy) throw new Error('PerformedBy is required');

    return new SaleLineSwap(props, undefined, orgId);
  }

  public static reconstitute(props: ISaleLineSwapProps, id: string, orgId: string): SaleLineSwap {
    return new SaleLineSwap(props, id, orgId);
  }

  get saleId(): string {
    return this.props.saleId;
  }

  get originalLineId(): string {
    return this.props.originalLineId;
  }

  get newLineId(): string | undefined {
    return this.props.newLineId;
  }

  get originalProductId(): string {
    return this.props.originalProductId;
  }

  get originalQuantity(): number {
    return this.props.originalQuantity;
  }

  get originalSalePrice(): number {
    return this.props.originalSalePrice;
  }

  get originalCurrency(): string {
    return this.props.originalCurrency;
  }

  get replacementProductId(): string {
    return this.props.replacementProductId;
  }

  get replacementQuantity(): number {
    return this.props.replacementQuantity;
  }

  get replacementSalePrice(): number {
    return this.props.replacementSalePrice;
  }

  get replacementCurrency(): string {
    return this.props.replacementCurrency;
  }

  get originalWarehouseId(): string {
    return this.props.originalWarehouseId;
  }

  get sourceWarehouseId(): string {
    return this.props.sourceWarehouseId;
  }

  get isCrossWarehouse(): boolean {
    return this.props.isCrossWarehouse;
  }

  get returnMovementId(): string | undefined {
    return this.props.returnMovementId;
  }

  get deductMovementId(): string | undefined {
    return this.props.deductMovementId;
  }

  get pricingStrategy(): PricingStrategy {
    return this.props.pricingStrategy;
  }

  get reason(): string | undefined {
    return this.props.reason;
  }

  get performedBy(): string {
    return this.props.performedBy;
  }
}
