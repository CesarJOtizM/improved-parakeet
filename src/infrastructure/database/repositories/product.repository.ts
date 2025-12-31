import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Product } from '@product/domain/entities/product.entity';
import { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  private readonly logger = new Logger(PrismaProductRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Product | null> {
    try {
      const productData = await this.prisma.product.findFirst({
        where: { id, orgId },
      });

      if (!productData) return null;

      return Product.reconstitute(
        {
          sku: SKU.reconstitute(productData.sku),
          name: ProductName.reconstitute(productData.name),
          description: productData.description || undefined,
          unit: UnitValueObject.create(
            productData.unit,
            productData.unit,
            0 // Default precision, should be stored if needed
          ),
          barcode: productData.barcode || undefined,
          brand: productData.brand || undefined,
          model: productData.model || undefined,
          status: ProductStatus.create(productData.isActive ? 'ACTIVE' : 'INACTIVE'),
          costMethod: CostMethod.create((productData.costMethod as 'AVG' | 'FIFO') || 'AVG'),
        },
        productData.id,
        productData.orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding product by ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding product by ID: ${error}`);
      }
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Product[]> {
    try {
      const productsData = await this.prisma.product.findMany({
        where: { orgId },
      });

      return productsData.map(productData =>
        Product.reconstitute(
          {
            sku: SKU.reconstitute(productData.sku),
            name: ProductName.reconstitute(productData.name),
            description: productData.description || undefined,
            unit: UnitValueObject.create(productData.unit, productData.unit, 0),
            barcode: productData.barcode || undefined,
            brand: productData.brand || undefined,
            model: productData.model || undefined,
            status: ProductStatus.create(productData.isActive ? 'ACTIVE' : 'INACTIVE'),
            costMethod: CostMethod.create((productData.costMethod as 'AVG' | 'FIFO') || 'AVG'),
          },
          productData.id,
          productData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all products: ${error.message}`);
      } else {
        this.logger.error(`Error finding all products: ${error}`);
      }
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.product.count({
        where: { id, orgId },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking product existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking product existence: ${error}`);
      }
      throw error;
    }
  }

  async save(product: Product): Promise<Product> {
    try {
      this.logger.debug('Saving product', {
        productId: product.id,
        sku: product.sku.getValue(),
        orgId: product.orgId,
        hasId: !!product.id,
      });

      const productData = {
        sku: product.sku.getValue(),
        name: product.name.getValue(),
        description: product.description || null,
        unit: product.unit.getValue().code,
        barcode: product.barcode || null,
        brand: product.brand || null,
        model: product.model || null,
        costMethod: product.costMethod.getValue(),
        isActive: product.status.getValue() === 'ACTIVE',
        orgId: product.orgId,
      };

      if (product.id) {
        const existingProduct = await this.prisma.product.findUnique({
          where: { id: product.id },
        });

        if (existingProduct) {
          const updatedProduct = await this.prisma.product.update({
            where: { id: product.id },
            data: productData,
          });

          return Product.reconstitute(
            {
              sku: SKU.reconstitute(updatedProduct.sku),
              name: ProductName.reconstitute(updatedProduct.name),
              description: updatedProduct.description || undefined,
              unit: UnitValueObject.create(updatedProduct.unit, updatedProduct.unit, 0),
              barcode: updatedProduct.barcode || undefined,
              brand: updatedProduct.brand || undefined,
              model: updatedProduct.model || undefined,
              status: ProductStatus.create(updatedProduct.isActive ? 'ACTIVE' : 'INACTIVE'),
              costMethod: CostMethod.create((updatedProduct.costMethod as 'AVG' | 'FIFO') || 'AVG'),
            },
            updatedProduct.id,
            updatedProduct.orgId
          );
        }
      }

      const newProduct = await this.prisma.product.create({
        data: productData,
      });

      return Product.reconstitute(
        {
          sku: SKU.reconstitute(newProduct.sku),
          name: ProductName.reconstitute(newProduct.name),
          description: newProduct.description || undefined,
          unit: UnitValueObject.create(newProduct.unit, newProduct.unit, 0),
          barcode: newProduct.barcode || undefined,
          brand: newProduct.brand || undefined,
          model: newProduct.model || undefined,
          status: ProductStatus.create(newProduct.isActive ? 'ACTIVE' : 'INACTIVE'),
          costMethod: CostMethod.create((newProduct.costMethod as 'AVG' | 'FIFO') || 'AVG'),
        },
        newProduct.id,
        newProduct.orgId
      );
    } catch (error) {
      this.logger.error('Error saving product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: product.id,
        sku: product.sku.getValue(),
        orgId: product.orgId,
      });
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.product.updateMany({
        where: { id, orgId },
        data: { isActive: false },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting product: ${error.message}`);
      } else {
        this.logger.error(`Error deleting product: ${error}`);
      }
      throw error;
    }
  }

  async findBySku(sku: string, orgId: string): Promise<Product | null> {
    try {
      const productData = await this.prisma.product.findFirst({
        where: { sku, orgId },
      });

      if (!productData) return null;

      return Product.reconstitute(
        {
          sku: SKU.reconstitute(productData.sku),
          name: ProductName.reconstitute(productData.name),
          description: productData.description || undefined,
          unit: UnitValueObject.create(productData.unit, productData.unit, 0),
          barcode: productData.barcode || undefined,
          brand: productData.brand || undefined,
          model: productData.model || undefined,
          status: ProductStatus.create(productData.isActive ? 'ACTIVE' : 'INACTIVE'),
          costMethod: CostMethod.create((productData.costMethod as 'AVG' | 'FIFO') || 'AVG'),
        },
        productData.id,
        productData.orgId
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding product by SKU: ${error.message}`);
      } else {
        this.logger.error(`Error finding product by SKU: ${error}`);
      }
      throw error;
    }
  }

  async findByCategory(categoryId: string, orgId: string): Promise<Product[]> {
    try {
      const productsData = await this.prisma.product.findMany({
        where: { category: categoryId, orgId },
      });

      return productsData.map(productData =>
        Product.reconstitute(
          {
            sku: SKU.reconstitute(productData.sku),
            name: ProductName.reconstitute(productData.name),
            description: productData.description || undefined,
            unit: UnitValueObject.create(productData.unit, productData.unit, 0),
            barcode: productData.barcode || undefined,
            brand: productData.brand || undefined,
            model: productData.model || undefined,
            status: ProductStatus.create(productData.isActive ? 'ACTIVE' : 'INACTIVE'),
            costMethod: CostMethod.create((productData.costMethod as 'AVG' | 'FIFO') || 'AVG'),
          },
          productData.id,
          productData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding products by category: ${error.message}`);
      } else {
        this.logger.error(`Error finding products by category: ${error}`);
      }
      throw error;
    }
  }

  async findByStatus(status: string, orgId: string): Promise<Product[]> {
    try {
      const isActive = status === 'ACTIVE';
      const productsData = await this.prisma.product.findMany({
        where: { isActive, orgId },
      });

      return productsData.map(productData =>
        Product.reconstitute(
          {
            sku: SKU.reconstitute(productData.sku),
            name: ProductName.reconstitute(productData.name),
            description: productData.description || undefined,
            unit: UnitValueObject.create(productData.unit, productData.unit, 0),
            barcode: productData.barcode || undefined,
            brand: productData.brand || undefined,
            model: productData.model || undefined,
            status: ProductStatus.create(productData.isActive ? 'ACTIVE' : 'INACTIVE'),
            costMethod: CostMethod.create((productData.costMethod as 'AVG' | 'FIFO') || 'AVG'),
          },
          productData.id,
          productData.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding products by status: ${error.message}`);
      } else {
        this.logger.error(`Error finding products by status: ${error}`);
      }
      throw error;
    }
  }

  async findByWarehouse(warehouseId: string, orgId: string): Promise<Product[]> {
    try {
      // Find products that have stock in the warehouse
      const stockData = await this.prisma.stock.findMany({
        where: { warehouseId, orgId, quantity: { gt: 0 } },
        include: { product: true },
      });

      return stockData.map(stock =>
        Product.reconstitute(
          {
            sku: SKU.reconstitute(stock.product.sku),
            name: ProductName.reconstitute(stock.product.name),
            description: stock.product.description || undefined,
            unit: UnitValueObject.create(stock.product.unit, stock.product.unit, 0),
            barcode: stock.product.barcode || undefined,
            brand: stock.product.brand || undefined,
            model: stock.product.model || undefined,
            status: ProductStatus.create(stock.product.isActive ? 'ACTIVE' : 'INACTIVE'),
            costMethod: CostMethod.create((stock.product.costMethod as 'AVG' | 'FIFO') || 'AVG'),
          },
          stock.product.id,
          stock.product.orgId
        )
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding products by warehouse: ${error.message}`);
      } else {
        this.logger.error(`Error finding products by warehouse: ${error}`);
      }
      throw error;
    }
  }

  async findLowStock(orgId: string): Promise<Product[]> {
    try {
      // This is a simplified implementation
      // In a real scenario, you might want to check against minQuantity thresholds
      const stockData = await this.prisma.stock.findMany({
        where: { orgId, quantity: { lte: 10 } }, // Assuming low stock is <= 10
        include: { product: true },
      });

      const productIds = new Set(stockData.map(s => s.productId));

      return Array.from(productIds).map(productId => {
        const stock = stockData.find(s => s.productId === productId);
        if (!stock) throw new Error('Product not found');
        return Product.reconstitute(
          {
            sku: SKU.reconstitute(stock.product.sku),
            name: ProductName.reconstitute(stock.product.name),
            description: stock.product.description || undefined,
            unit: UnitValueObject.create(stock.product.unit, stock.product.unit, 0),
            barcode: stock.product.barcode || undefined,
            brand: stock.product.brand || undefined,
            model: stock.product.model || undefined,
            status: ProductStatus.create(stock.product.isActive ? 'ACTIVE' : 'INACTIVE'),
            costMethod: CostMethod.create((stock.product.costMethod as 'AVG' | 'FIFO') || 'AVG'),
          },
          stock.product.id,
          stock.product.orgId
        );
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding low stock products: ${error.message}`);
      } else {
        this.logger.error(`Error finding low stock products: ${error}`);
      }
      throw error;
    }
  }

  async existsBySku(sku: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.product.count({
        where: { sku, orgId },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking SKU existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking SKU existence: ${error}`);
      }
      throw error;
    }
  }
}
