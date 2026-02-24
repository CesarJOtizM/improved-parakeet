import { ISaleProps, Sale } from '@sale/domain/entities/sale.entity';
import { ISaleLineProps, SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

/**
 * Sale line DTO for creating sales (input)
 */
export interface ISaleLineCreateInput {
  productId: string;
  locationId?: string; // Optional for MVP - warehouse is the location
  quantity: number;
  salePrice: number;
  currency?: string;
  extra?: Record<string, unknown>;
}

/**
 * Sale DTO for creating sales (input)
 */
export interface ISaleCreateInput {
  warehouseId: string;
  customerReference?: string;
  externalReference?: string;
  note?: string;
  lines?: ISaleLineCreateInput[];
  createdBy: string;
}

/**
 * Sale line DTO for response (output)
 */
export interface ISaleLineResponseData {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  locationId?: string; // Optional for MVP - warehouse is the location
  quantity: number;
  salePrice: number;
  currency: string;
  totalPrice: number;
  extra?: Record<string, unknown>;
}

/**
 * Sale DTO for response (output)
 */
export interface ISaleResponseData {
  id: string;
  saleNumber: string;
  status: string;
  warehouseId: string;
  warehouseName?: string;
  customerReference?: string;
  externalReference?: string;
  note?: string;
  confirmedAt?: Date;
  confirmedBy?: string;
  confirmedByName?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelledByName?: string;
  pickedAt?: Date;
  pickedBy?: string;
  pickedByName?: string;
  shippedAt?: Date;
  shippedBy?: string;
  shippedByName?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  shippingNotes?: string;
  completedAt?: Date;
  completedBy?: string;
  completedByName?: string;
  returnedAt?: Date;
  returnedBy?: string;
  returnedByName?: string;
  movementId?: string;
  createdBy: string;
  createdByName?: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  totalAmount: number;
  currency: string;
  lines?: ISaleLineResponseData[];
}

/**
 * SaleMapper - Handles bidirectional conversion between DTOs and domain entities
 *
 * This mapper is a pure function utility class with no dependencies or side effects.
 * It handles value object creation for DTO→Domain and value extraction for Domain→DTO.
 */
export class SaleMapper {
  /**
   * Converts a DTO input to domain entity props
   * Creates all necessary value objects (SaleNumber, SaleStatus, etc.)
   *
   * @param input - The DTO input for creating a sale
   * @param saleNumber - The generated SaleNumber value object
   * @returns ISaleProps ready for Sale.create()
   */
  public static toDomainProps(input: ISaleCreateInput, saleNumber: SaleNumber): ISaleProps {
    const status = SaleStatus.create('DRAFT');

    return {
      saleNumber,
      status,
      warehouseId: input.warehouseId,
      customerReference: input.customerReference,
      externalReference: input.externalReference,
      note: input.note,
      createdBy: input.createdBy,
    };
  }

  /**
   * Converts a line DTO input to domain entity props
   *
   * @param input - The DTO input for creating a sale line
   * @returns ISaleLineProps ready for SaleLine.create()
   */
  public static toLineDomainProps(input: ISaleLineCreateInput): ISaleLineProps {
    const quantity = Quantity.create(input.quantity, 6);
    const currency = input.currency || 'COP';
    const salePrice = SalePrice.create(input.salePrice, currency, 2);

    return {
      productId: input.productId,
      locationId: input.locationId,
      quantity,
      salePrice,
      extra: input.extra,
    };
  }

  /**
   * Creates a SaleLine entity from input
   *
   * @param input - The DTO input for creating a sale line
   * @param orgId - The organization ID
   * @returns SaleLine entity
   */
  public static createLineEntity(input: ISaleLineCreateInput, orgId: string): SaleLine {
    const props = SaleMapper.toLineDomainProps(input);
    return SaleLine.create(props, orgId);
  }

  /**
   * Converts a SaleLine domain entity to a response DTO
   *
   * @param line - The SaleLine domain entity
   * @returns ISaleLineResponseData for API responses
   */
  public static lineToResponseData(line: SaleLine): ISaleLineResponseData {
    const totalPrice = line.getTotalPrice();
    return {
      id: line.id,
      productId: line.productId,
      locationId: line.locationId,
      quantity: line.quantity.getNumericValue(),
      salePrice: line.salePrice.getAmount(),
      currency: line.salePrice.getCurrency(),
      totalPrice: totalPrice.getAmount(),
      extra: line.extra,
    };
  }

  /**
   * Converts a Sale domain entity to a response DTO
   * Extracts values from all value objects
   *
   * @param sale - The Sale domain entity
   * @param includeLines - Whether to include lines in the response (default: false)
   * @returns ISaleResponseData for API responses
   */
  public static toResponseData(sale: Sale, includeLines: boolean = false): ISaleResponseData {
    const totalAmount = sale.getTotalAmount();
    const responseData: ISaleResponseData = {
      id: sale.id,
      saleNumber: sale.saleNumber.getValue(),
      status: sale.status.getValue(),
      warehouseId: sale.warehouseId,
      customerReference: sale.customerReference,
      externalReference: sale.externalReference,
      note: sale.note,
      confirmedAt: sale.confirmedAt,
      confirmedBy: sale.confirmedBy,
      cancelledAt: sale.cancelledAt,
      cancelledBy: sale.cancelledBy,
      pickedAt: sale.pickedAt,
      pickedBy: sale.pickedBy,
      shippedAt: sale.shippedAt,
      shippedBy: sale.shippedBy,
      trackingNumber: sale.trackingNumber,
      shippingCarrier: sale.shippingCarrier,
      shippingNotes: sale.shippingNotes,
      completedAt: sale.completedAt,
      completedBy: sale.completedBy,
      returnedAt: sale.returnedAt,
      returnedBy: sale.returnedBy,
      movementId: sale.movementId,
      createdBy: sale.createdBy,
      orgId: sale.orgId!,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      totalAmount: totalAmount.getAmount(),
      currency: totalAmount.getCurrency(),
    };

    if (includeLines) {
      responseData.lines = sale.getLines().map(line => SaleMapper.lineToResponseData(line));
    }

    return responseData;
  }

  /**
   * Converts an array of Sale domain entities to response DTOs
   *
   * @param sales - Array of Sale domain entities
   * @param includeLines - Whether to include lines in the response (default: false)
   * @returns Array of ISaleResponseData for API responses
   */
  public static toResponseDataList(
    sales: Sale[],
    includeLines: boolean = false
  ): ISaleResponseData[] {
    return sales.map(sale => SaleMapper.toResponseData(sale, includeLines));
  }
}
