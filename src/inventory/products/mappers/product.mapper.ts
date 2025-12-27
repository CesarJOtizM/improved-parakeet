import { IProductProps, Product } from '@product/domain/entities/product.entity';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';

/**
 * Product DTO for creating products (input)
 */
export interface IProductCreateInput {
  sku: string;
  name: string;
  description?: string;
  unit: {
    code: string;
    name: string;
    precision: number;
  };
  barcode?: string;
  brand?: string;
  model?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  costMethod?: 'AVG' | 'FIFO';
}

/**
 * Product DTO for response (output)
 */
export interface IProductResponseData {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit: {
    code: string;
    name: string;
    precision: number;
  };
  barcode?: string;
  brand?: string;
  model?: string;
  status: string;
  costMethod: string;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ProductMapper - Handles bidirectional conversion between DTOs and domain entities
 *
 * This mapper is a pure function utility class with no dependencies or side effects.
 * It handles value object creation for DTO→Domain and value extraction for Domain→DTO.
 */
export class ProductMapper {
  /**
   * Converts a DTO input to domain entity props
   * Creates all necessary value objects (SKU, ProductName, etc.)
   *
   * @param input - The DTO input for creating a product
   * @returns IProductProps ready for Product.create()
   */
  public static toDomainProps(input: IProductCreateInput): IProductProps {
    const sku = SKU.create(input.sku);
    const name = ProductName.create(input.name);
    const unit = UnitValueObject.create(input.unit.code, input.unit.name, input.unit.precision);
    const status = ProductStatus.create(input.status || 'ACTIVE');
    const costMethod = CostMethod.create(input.costMethod || 'AVG');

    return {
      sku,
      name,
      description: input.description,
      unit,
      barcode: input.barcode,
      brand: input.brand,
      model: input.model,
      status,
      costMethod,
    };
  }

  /**
   * Converts a Product domain entity to a response DTO
   * Extracts values from all value objects
   *
   * @param product - The Product domain entity
   * @returns IProductResponseData for API responses
   */
  public static toResponseData(product: Product): IProductResponseData {
    return {
      id: product.id,
      sku: product.sku.getValue(),
      name: product.name.getValue(),
      description: product.description,
      unit: {
        code: product.unit.getValue().code,
        name: product.unit.getValue().name,
        precision: product.unit.getValue().precision,
      },
      barcode: product.barcode,
      brand: product.brand,
      model: product.model,
      status: product.status.getValue(),
      costMethod: product.costMethod.getValue(),
      orgId: product.orgId!,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Converts an array of Product domain entities to response DTOs
   *
   * @param products - Array of Product domain entities
   * @returns Array of IProductResponseData for API responses
   */
  public static toResponseDataList(products: Product[]): IProductResponseData[] {
    return products.map(product => ProductMapper.toResponseData(product));
  }
}
