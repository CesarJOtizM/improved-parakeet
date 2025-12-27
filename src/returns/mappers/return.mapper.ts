import { IReturnProps, Return } from '@returns/domain/entities/return.entity';
import { IReturnLineProps, ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

/**
 * Return line DTO for creating returns (input)
 */
export interface IReturnLineCreateInput {
  productId: string;
  locationId: string;
  quantity: number;
  originalSalePrice?: number; // Required for customer returns
  originalUnitCost?: number; // Required for supplier returns
  currency?: string;
  extra?: Record<string, unknown>;
}

/**
 * Return DTO for creating returns (input)
 */
export interface IReturnCreateInput {
  type: 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER';
  warehouseId: string;
  saleId?: string; // Required for customer returns
  sourceMovementId?: string; // Required for supplier returns
  reason?: string;
  note?: string;
  lines?: IReturnLineCreateInput[];
  createdBy: string;
}

/**
 * Return line DTO for response (output)
 */
export interface IReturnLineResponseData {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  originalSalePrice?: number;
  originalUnitCost?: number;
  currency: string;
  totalPrice: number;
  extra?: Record<string, unknown>;
}

/**
 * Return DTO for response (output)
 */
export interface IReturnResponseData {
  id: string;
  returnNumber: string;
  status: string;
  type: string;
  reason: string | null;
  warehouseId: string;
  saleId?: string;
  sourceMovementId?: string;
  returnMovementId?: string;
  note?: string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  createdBy: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  totalAmount?: number;
  currency?: string;
  lines: IReturnLineResponseData[];
}

/**
 * ReturnMapper - Handles bidirectional conversion between DTOs and domain entities
 *
 * This mapper is a pure function utility class with no dependencies or side effects.
 * It handles value object creation for DTO→Domain and value extraction for Domain→DTO.
 */
export class ReturnMapper {
  /**
   * Converts a DTO input to domain entity props
   * Creates all necessary value objects (ReturnNumber, ReturnStatus, etc.)
   *
   * @param input - The DTO input for creating a return
   * @param returnNumber - The generated ReturnNumber value object
   * @returns IReturnProps ready for Return.create()
   */
  public static toDomainProps(input: IReturnCreateInput, returnNumber: ReturnNumber): IReturnProps {
    const status = ReturnStatus.create('DRAFT');
    const type = ReturnType.create(input.type);
    const reason = ReturnReason.create(input.reason);

    return {
      returnNumber,
      status,
      type,
      reason,
      warehouseId: input.warehouseId,
      saleId: input.type === 'RETURN_CUSTOMER' ? input.saleId : undefined,
      sourceMovementId: input.type === 'RETURN_SUPPLIER' ? input.sourceMovementId : undefined,
      note: input.note,
      createdBy: input.createdBy,
    };
  }

  /**
   * Converts a line DTO input to domain entity props
   *
   * @param input - The DTO input for creating a return line
   * @param returnType - The return type (RETURN_CUSTOMER or RETURN_SUPPLIER)
   * @returns IReturnLineProps ready for ReturnLine.create()
   */
  public static toLineDomainProps(
    input: IReturnLineCreateInput,
    returnType: 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER'
  ): IReturnLineProps {
    const quantity = Quantity.create(input.quantity, 6);
    const currency = input.currency || 'COP';

    let originalSalePrice: SalePrice | undefined;
    let originalUnitCost: Money | undefined;

    if (returnType === 'RETURN_CUSTOMER' && input.originalSalePrice !== undefined) {
      originalSalePrice = SalePrice.create(input.originalSalePrice, currency, 2);
    }

    if (returnType === 'RETURN_SUPPLIER' && input.originalUnitCost !== undefined) {
      originalUnitCost = Money.create(input.originalUnitCost, currency, 2);
    }

    return {
      productId: input.productId,
      locationId: input.locationId,
      quantity,
      originalSalePrice,
      originalUnitCost,
      currency,
      extra: input.extra,
    };
  }

  /**
   * Creates a ReturnLine entity from input
   *
   * @param input - The DTO input for creating a return line
   * @param returnType - The return type (RETURN_CUSTOMER or RETURN_SUPPLIER)
   * @param orgId - The organization ID
   * @returns ReturnLine entity
   */
  public static createLineEntity(
    input: IReturnLineCreateInput,
    returnType: 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER',
    orgId: string
  ): ReturnLine {
    const props = ReturnMapper.toLineDomainProps(input, returnType);
    const returnTypeVO = ReturnType.create(returnType);
    return ReturnLine.create(props, orgId, returnTypeVO);
  }

  /**
   * Converts a ReturnLine domain entity to a response DTO
   *
   * @param line - The ReturnLine domain entity
   * @returns IReturnLineResponseData for API responses
   */
  public static lineToResponseData(line: ReturnLine): IReturnLineResponseData {
    const lineTotal = line.getTotalPrice();
    return {
      id: line.id,
      productId: line.productId,
      locationId: line.locationId,
      quantity: line.quantity.getNumericValue(),
      originalSalePrice: line.originalSalePrice?.getAmount(),
      originalUnitCost: line.originalUnitCost?.getAmount(),
      currency: line.currency,
      totalPrice: lineTotal?.getAmount() || 0,
      extra: line.extra,
    };
  }

  /**
   * Converts a Return domain entity to a response DTO
   * Extracts values from all value objects
   *
   * @param returnEntity - The Return domain entity
   * @returns IReturnResponseData for API responses
   */
  public static toResponseData(returnEntity: Return): IReturnResponseData {
    const totalAmount = returnEntity.getTotalAmount();
    return {
      id: returnEntity.id,
      returnNumber: returnEntity.returnNumber.getValue(),
      status: returnEntity.status.getValue(),
      type: returnEntity.type.getValue(),
      reason: returnEntity.reason.getValue(),
      warehouseId: returnEntity.warehouseId,
      saleId: returnEntity.saleId,
      sourceMovementId: returnEntity.sourceMovementId,
      returnMovementId: returnEntity.returnMovementId,
      note: returnEntity.note,
      confirmedAt: returnEntity.confirmedAt,
      cancelledAt: returnEntity.cancelledAt,
      createdBy: returnEntity.createdBy,
      orgId: returnEntity.orgId!,
      createdAt: returnEntity.createdAt,
      updatedAt: returnEntity.updatedAt,
      totalAmount: totalAmount?.getAmount(),
      currency: totalAmount?.getCurrency(),
      lines: returnEntity.getLines().map(line => ReturnMapper.lineToResponseData(line)),
    };
  }

  /**
   * Converts an array of Return domain entities to response DTOs
   *
   * @param returns - Array of Return domain entities
   * @returns Array of IReturnResponseData for API responses
   */
  public static toResponseDataList(returns: Return[]): IReturnResponseData[] {
    return returns.map(returnEntity => ReturnMapper.toResponseData(returnEntity));
  }
}
