import { ValueObject } from '@shared/domain/base/valueObject.base';

export const REPORT_TYPES = {
  // Inventory Reports
  AVAILABLE_INVENTORY: 'AVAILABLE_INVENTORY',
  MOVEMENT_HISTORY: 'MOVEMENT_HISTORY',
  VALUATION: 'VALUATION',
  LOW_STOCK: 'LOW_STOCK',
  MOVEMENTS: 'MOVEMENTS',
  FINANCIAL: 'FINANCIAL',
  TURNOVER: 'TURNOVER',
  // Sales Reports
  SALES: 'SALES',
  SALES_BY_PRODUCT: 'SALES_BY_PRODUCT',
  SALES_BY_WAREHOUSE: 'SALES_BY_WAREHOUSE',
  // Returns Reports
  RETURNS: 'RETURNS',
  RETURNS_BY_TYPE: 'RETURNS_BY_TYPE',
  RETURNS_BY_PRODUCT: 'RETURNS_BY_PRODUCT',
  RETURNS_BY_SALE: 'RETURNS_BY_SALE',
  RETURNS_CUSTOMER: 'RETURNS_CUSTOMER',
  RETURNS_SUPPLIER: 'RETURNS_SUPPLIER',
} as const;

export type ReportTypeValue = (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES];

export interface IReportTypeProps {
  value: ReportTypeValue;
}

export class ReportType extends ValueObject<IReportTypeProps> {
  private static readonly validTypes = Object.values(REPORT_TYPES);

  private constructor(props: IReportTypeProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string): ReportType {
    return new ReportType({ value: value as ReportTypeValue });
  }

  private validate(props: IReportTypeProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Report type cannot be empty');
    }

    if (!ReportType.validTypes.includes(props.value)) {
      throw new Error(
        `Invalid report type: ${props.value}. Valid types are: ${ReportType.validTypes.join(', ')}`
      );
    }
  }

  public getValue(): ReportTypeValue {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: ReportType): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }

  public isInventoryReport(): boolean {
    return (
      this.props.value === REPORT_TYPES.AVAILABLE_INVENTORY ||
      this.props.value === REPORT_TYPES.MOVEMENT_HISTORY ||
      this.props.value === REPORT_TYPES.VALUATION ||
      this.props.value === REPORT_TYPES.LOW_STOCK ||
      this.props.value === REPORT_TYPES.MOVEMENTS ||
      this.props.value === REPORT_TYPES.FINANCIAL ||
      this.props.value === REPORT_TYPES.TURNOVER
    );
  }

  public isSalesReport(): boolean {
    return (
      this.props.value === REPORT_TYPES.SALES ||
      this.props.value === REPORT_TYPES.SALES_BY_PRODUCT ||
      this.props.value === REPORT_TYPES.SALES_BY_WAREHOUSE
    );
  }

  public isReturnsReport(): boolean {
    return (
      this.props.value === REPORT_TYPES.RETURNS ||
      this.props.value === REPORT_TYPES.RETURNS_BY_TYPE ||
      this.props.value === REPORT_TYPES.RETURNS_BY_PRODUCT ||
      this.props.value === REPORT_TYPES.RETURNS_BY_SALE ||
      this.props.value === REPORT_TYPES.RETURNS_CUSTOMER ||
      this.props.value === REPORT_TYPES.RETURNS_SUPPLIER
    );
  }
}
