import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IDateRange {
  startDate: Date;
  endDate: Date;
}

export const GROUP_BY_OPTIONS = {
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  PRODUCT: 'PRODUCT',
  WAREHOUSE: 'WAREHOUSE',
  CUSTOMER: 'CUSTOMER',
  TYPE: 'TYPE',
} as const;

export type GroupByValue = (typeof GROUP_BY_OPTIONS)[keyof typeof GROUP_BY_OPTIONS];

export const PERIOD_OPTIONS = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
} as const;

export type PeriodValue = (typeof PERIOD_OPTIONS)[keyof typeof PERIOD_OPTIONS];

export const RETURN_TYPE_OPTIONS = {
  CUSTOMER: 'CUSTOMER',
  SUPPLIER: 'SUPPLIER',
} as const;

export type ReturnTypeValue = (typeof RETURN_TYPE_OPTIONS)[keyof typeof RETURN_TYPE_OPTIONS];

export const LOW_STOCK_SEVERITY = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
} as const;

export type LowStockSeverityValue = (typeof LOW_STOCK_SEVERITY)[keyof typeof LOW_STOCK_SEVERITY];

export interface IReportParametersInput {
  dateRange?: IDateRange;
  warehouseId?: string;
  productId?: string;
  category?: string;
  status?: string;
  returnType?: ReturnTypeValue;
  groupBy?: GroupByValue;
  period?: PeriodValue;
  movementType?: string;
  customerReference?: string;
  saleId?: string;
  movementId?: string;
  includeInactive?: boolean;
  locationId?: string;
  severity?: LowStockSeverityValue;
  deadStockDays?: number;
}

export interface IReportParametersProps {
  value: IReportParametersInput;
}

export class ReportParameters extends ValueObject<IReportParametersProps> {
  private constructor(props: IReportParametersProps) {
    super(props);
    this.validate(props);
  }

  public static create(input: IReportParametersInput): ReportParameters {
    return new ReportParameters({ value: input });
  }

  public static empty(): ReportParameters {
    return new ReportParameters({ value: {} });
  }

  private validate(props: IReportParametersProps): void {
    const { value } = props;

    // Validate date range if provided
    if (value.dateRange) {
      if (!value.dateRange.startDate || !value.dateRange.endDate) {
        throw new Error('Date range must have both startDate and endDate');
      }
      if (value.dateRange.startDate > value.dateRange.endDate) {
        throw new Error('Start date cannot be after end date');
      }
    }

    // Validate groupBy if provided
    if (value.groupBy && !Object.values(GROUP_BY_OPTIONS).includes(value.groupBy)) {
      throw new Error(`Invalid groupBy value: ${value.groupBy}`);
    }

    // Validate period if provided
    if (value.period && !Object.values(PERIOD_OPTIONS).includes(value.period)) {
      throw new Error(`Invalid period value: ${value.period}`);
    }

    // Validate returnType if provided
    if (value.returnType && !Object.values(RETURN_TYPE_OPTIONS).includes(value.returnType)) {
      throw new Error(`Invalid returnType value: ${value.returnType}`);
    }

    // Validate severity if provided
    if (value.severity && !Object.values(LOW_STOCK_SEVERITY).includes(value.severity)) {
      throw new Error(`Invalid severity value: ${value.severity}`);
    }
  }

  public getValue(): IReportParametersInput {
    return { ...this.props.value };
  }

  public getDateRange(): IDateRange | undefined {
    return this.props.value.dateRange;
  }

  public getWarehouseId(): string | undefined {
    return this.props.value.warehouseId;
  }

  public getProductId(): string | undefined {
    return this.props.value.productId;
  }

  public getCategory(): string | undefined {
    return this.props.value.category;
  }

  public getStatus(): string | undefined {
    return this.props.value.status;
  }

  public getReturnType(): ReturnTypeValue | undefined {
    return this.props.value.returnType;
  }

  public getGroupBy(): GroupByValue | undefined {
    return this.props.value.groupBy;
  }

  public getPeriod(): PeriodValue | undefined {
    return this.props.value.period;
  }

  public getMovementType(): string | undefined {
    return this.props.value.movementType;
  }

  public getCustomerReference(): string | undefined {
    return this.props.value.customerReference;
  }

  public getSaleId(): string | undefined {
    return this.props.value.saleId;
  }

  public getMovementId(): string | undefined {
    return this.props.value.movementId;
  }

  public getIncludeInactive(): boolean {
    return this.props.value.includeInactive ?? false;
  }

  public getLocationId(): string | undefined {
    return this.props.value.locationId;
  }

  public getSeverity(): LowStockSeverityValue | undefined {
    return this.props.value.severity;
  }

  public toJSON(): IReportParametersInput {
    const value = this.getValue();
    return {
      ...value,
      dateRange: value.dateRange
        ? {
            startDate: value.dateRange.startDate,
            endDate: value.dateRange.endDate,
          }
        : undefined,
    };
  }

  public equals(other?: ReportParameters): boolean {
    if (!other) {
      return false;
    }
    return JSON.stringify(this.props.value) === JSON.stringify(other.props.value);
  }

  public hasDateRange(): boolean {
    return !!this.props.value.dateRange;
  }

  public hasWarehouseFilter(): boolean {
    return !!this.props.value.warehouseId;
  }

  public hasProductFilter(): boolean {
    return !!this.props.value.productId;
  }
}
