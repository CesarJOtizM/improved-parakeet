import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

export interface IReorderRuleProps {
  productId: string;
  warehouseId: string;
  minQty: MinQuantity;
  maxQty: MaxQuantity;
  safetyQty: SafetyStock;
}

export class ReorderRule extends AggregateRoot<IReorderRuleProps> {
  private constructor(props: IReorderRuleProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: IReorderRuleProps, orgId: string): ReorderRule {
    const reorderRule = new ReorderRule(props, undefined, orgId);
    return reorderRule;
  }

  public static reconstitute(props: IReorderRuleProps, id: string, orgId: string): ReorderRule {
    return new ReorderRule(props, id, orgId);
  }

  public updateMinQty(minQty: MinQuantity): void {
    this.props.minQty = minQty;
    this.validateQuantities();
    this.updateTimestamp();
  }

  public updateMaxQty(maxQty: MaxQuantity): void {
    this.props.maxQty = maxQty;
    this.validateQuantities();
    this.updateTimestamp();
  }

  public updateSafetyQty(safetyQty: SafetyStock): void {
    this.props.safetyQty = safetyQty;
    this.validateQuantities();
    this.updateTimestamp();
  }

  private validateQuantities(): void {
    if (this.props.maxQty.getNumericValue() <= this.props.minQty.getNumericValue()) {
      throw new Error('MaxQuantity must be greater than MinQuantity');
    }
  }

  // Getters
  get productId(): string {
    return this.props.productId;
  }

  get warehouseId(): string {
    return this.props.warehouseId;
  }

  get minQty(): MinQuantity {
    return this.props.minQty;
  }

  get maxQty(): MaxQuantity {
    return this.props.maxQty;
  }

  get safetyQty(): SafetyStock {
    return this.props.safetyQty;
  }
}
