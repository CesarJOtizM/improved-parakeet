import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  IPaginatedResult,
  IPaginationOptions,
} from '@infrastructure/database/utils/queryOptimizer';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Product } from '@product/domain/entities/product.entity';
import { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { Price } from '@product/domain/valueObjects/price.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';
import { IPrismaSpecification } from '@shared/domain/specifications';
import { cacheEntity, getCachedEntity, invalidateEntityCache } from '@shared/infrastructure/cache';

import type { ICacheService } from '@shared/ports/cache';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  private readonly logger = new Logger(PrismaProductRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('CacheService')
    @Optional()
    private readonly cacheService?: ICacheService
  ) {}

  async findById(id: string, orgId: string): Promise<Product | null> {
    try {
      // Try to get from cache first
      if (this.cacheService) {
        const cached = await getCachedEntity<Product>(this.cacheService, 'product', id, orgId);
        if (cached) {
          return cached;
        }
      }

      const productData = await this.prisma.product.findUnique({
        where: { id },
        include: { categories: { select: { id: true, name: true } } },
      });

      if (!productData || productData.orgId !== orgId) return null;

      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute(productData.sku),
          name: ProductName.reconstitute(productData.name),
          description: productData.description || undefined,
          categories: productData.categories ?? [],
          unit: UnitValueObject.create(
            productData.unit,
            productData.unit,
            0 // Default precision, should be stored if needed
          ),
          barcode: productData.barcode || undefined,
          brand: productData.brand || undefined,
          model: productData.model || undefined,
          price: productData.price
            ? Price.create(
                typeof productData.price === 'number'
                  ? productData.price
                  : productData.price.toNumber(),
                productData.currency || 'COP',
                2
              )
            : undefined,
          status: ProductStatus.create(productData.isActive ? 'ACTIVE' : 'INACTIVE'),
          costMethod: CostMethod.create((productData.costMethod as 'AVG' | 'FIFO') || 'AVG'),
          statusChangedBy: productData.statusChangedBy || undefined,
          statusChangedAt: productData.statusChangedAt || undefined,
        },
        productData.id,
        productData.orgId
      );

      // Cache the product
      if (this.cacheService) {
        await cacheEntity(this.cacheService, 'product', product.id, product, orgId);
      }

      return product;
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
        include: { categories: { select: { id: true, name: true } } },
      });

      return productsData.map(productData =>
        Product.reconstitute(
          {
            sku: SKU.reconstitute(productData.sku),
            name: ProductName.reconstitute(productData.name),
            description: productData.description || undefined,
            categories: productData.categories ?? [],
            unit: UnitValueObject.create(productData.unit, productData.unit, 0),
            barcode: productData.barcode || undefined,
            brand: productData.brand || undefined,
            model: productData.model || undefined,
            price: productData.price
              ? Price.create(
                  typeof productData.price === 'number'
                    ? productData.price
                    : productData.price.toNumber(),
                  'COP',
                  2
                )
              : undefined,
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
        price: product.price ? product.price.getAmount() : null,
        currency: product.price ? product.price.getCurrency() : null,
        costMethod: product.costMethod.getValue(),
        isActive: product.status.getValue() === 'ACTIVE',
        statusChangedBy: product.statusChangedBy ?? null,
        statusChangedAt: product.statusChangedAt ?? null,
        orgId: product.orgId,
      };

      if (product.id) {
        const existingProduct = await this.prisma.product.findUnique({
          where: { id: product.id },
        });

        if (existingProduct) {
          const updatedProduct = await this.prisma.product.update({
            where: { id: product.id },
            data: {
              ...productData,
              categories: {
                set: product.categories.map(c => ({ id: c.id })),
              },
            },
            include: { categories: { select: { id: true, name: true } } },
          });

          const savedProduct = Product.reconstitute(
            {
              sku: SKU.reconstitute(updatedProduct.sku),
              name: ProductName.reconstitute(updatedProduct.name),
              description: updatedProduct.description || undefined,
              categories: updatedProduct.categories ?? [],
              unit: UnitValueObject.create(updatedProduct.unit, updatedProduct.unit, 0),
              barcode: updatedProduct.barcode || undefined,
              brand: updatedProduct.brand || undefined,
              model: updatedProduct.model || undefined,
              price: updatedProduct.price
                ? Price.create(
                    typeof updatedProduct.price === 'number'
                      ? updatedProduct.price
                      : updatedProduct.price.toNumber(),
                    'COP',
                    2
                  )
                : undefined,
              status: ProductStatus.create(updatedProduct.isActive ? 'ACTIVE' : 'INACTIVE'),
              costMethod: CostMethod.create((updatedProduct.costMethod as 'AVG' | 'FIFO') || 'AVG'),
              statusChangedBy: updatedProduct.statusChangedBy || undefined,
              statusChangedAt: updatedProduct.statusChangedAt || undefined,
            },
            updatedProduct.id,
            updatedProduct.orgId
          );

          // Invalidate and update cache
          if (this.cacheService) {
            await invalidateEntityCache(
              this.cacheService,
              'product',
              savedProduct.id,
              savedProduct.orgId
            );
            await cacheEntity(
              this.cacheService,
              'product',
              savedProduct.id,
              savedProduct,
              savedProduct.orgId
            );
          }

          return savedProduct;
        }
      }

      const newProduct = await this.prisma.product.create({
        data: {
          ...productData,
          ...(product.categories.length > 0 && {
            categories: {
              connect: product.categories.map(c => ({ id: c.id })),
            },
          }),
        },
        include: { categories: { select: { id: true, name: true } } },
      });

      const savedProduct = Product.reconstitute(
        {
          sku: SKU.reconstitute(newProduct.sku),
          name: ProductName.reconstitute(newProduct.name),
          description: newProduct.description || undefined,
          categories: newProduct.categories ?? [],
          unit: UnitValueObject.create(newProduct.unit, newProduct.unit, 0),
          barcode: newProduct.barcode || undefined,
          brand: newProduct.brand || undefined,
          model: newProduct.model || undefined,
          price: newProduct.price
            ? Price.create(
                typeof newProduct.price === 'number'
                  ? newProduct.price
                  : newProduct.price.toNumber(),
                'COP',
                2
              )
            : undefined,
          status: ProductStatus.create(newProduct.isActive ? 'ACTIVE' : 'INACTIVE'),
          costMethod: CostMethod.create((newProduct.costMethod as 'AVG' | 'FIFO') || 'AVG'),
          statusChangedBy: newProduct.statusChangedBy || undefined,
          statusChangedAt: newProduct.statusChangedAt || undefined,
        },
        newProduct.id,
        newProduct.orgId
      );

      // Cache the new product
      if (this.cacheService) {
        await cacheEntity(
          this.cacheService,
          'product',
          savedProduct.id,
          savedProduct,
          savedProduct.orgId
        );
      }

      return savedProduct;
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

      // Invalidate cache
      if (this.cacheService) {
        await invalidateEntityCache(this.cacheService, 'product', id, orgId);
      }
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
      // For SKU lookup, we can't use simple cache key, so we'll query and cache by ID
      // Use findFirst since sku+orgId is unique but Prisma requires findFirst for compound unique
      const productData = await this.prisma.product.findFirst({
        where: { sku, orgId },
      });

      if (!productData) return null;

      // Try cache by ID first
      if (this.cacheService) {
        const cached = await getCachedEntity<Product>(
          this.cacheService,
          'product',
          productData.id,
          orgId
        );
        if (cached) {
          return cached;
        }
      }

      const product = Product.reconstitute(
        {
          sku: SKU.reconstitute(productData.sku),
          name: ProductName.reconstitute(productData.name),
          description: productData.description || undefined,
          categories: [],
          unit: UnitValueObject.create(productData.unit, productData.unit, 0),
          barcode: productData.barcode || undefined,
          brand: productData.brand || undefined,
          model: productData.model || undefined,
          price: productData.price
            ? Price.create(
                typeof productData.price === 'number'
                  ? productData.price
                  : productData.price.toNumber(),
                productData.currency || 'COP',
                2
              )
            : undefined,
          status: ProductStatus.create(productData.isActive ? 'ACTIVE' : 'INACTIVE'),
          costMethod: CostMethod.create((productData.costMethod as 'AVG' | 'FIFO') || 'AVG'),
        },
        productData.id,
        productData.orgId
      );

      // Cache the product
      if (this.cacheService) {
        await cacheEntity(this.cacheService, 'product', product.id, product, orgId);
      }

      return product;
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
        where: { categories: { some: { id: categoryId } }, orgId },
        include: { categories: { select: { id: true, name: true } } },
      });

      return productsData.map(productData =>
        Product.reconstitute(
          {
            sku: SKU.reconstitute(productData.sku),
            name: ProductName.reconstitute(productData.name),
            description: productData.description || undefined,
            categories: productData.categories ?? [],
            unit: UnitValueObject.create(productData.unit, productData.unit, 0),
            barcode: productData.barcode || undefined,
            brand: productData.brand || undefined,
            model: productData.model || undefined,
            price: productData.price
              ? Price.create(
                  typeof productData.price === 'number'
                    ? productData.price
                    : productData.price.toNumber(),
                  'COP',
                  2
                )
              : undefined,
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
            categories: [],
            unit: UnitValueObject.create(productData.unit, productData.unit, 0),
            barcode: productData.barcode || undefined,
            brand: productData.brand || undefined,
            model: productData.model || undefined,
            price: productData.price
              ? Price.create(
                  typeof productData.price === 'number'
                    ? productData.price
                    : productData.price.toNumber(),
                  'COP',
                  2
                )
              : undefined,
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
            categories: [],
            unit: UnitValueObject.create(stock.product.unit, stock.product.unit, 0),
            barcode: stock.product.barcode || undefined,
            brand: stock.product.brand || undefined,
            model: stock.product.model || undefined,
            price: stock.product.price
              ? Price.create(
                  typeof stock.product.price === 'number'
                    ? stock.product.price
                    : stock.product.price.toNumber(),
                  'COP',
                  2
                )
              : undefined,
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
            categories: [],
            unit: UnitValueObject.create(stock.product.unit, stock.product.unit, 0),
            barcode: stock.product.barcode || undefined,
            brand: stock.product.brand || undefined,
            model: stock.product.model || undefined,
            price: stock.product.price
              ? Price.create(
                  typeof stock.product.price === 'number'
                    ? stock.product.price
                    : stock.product.price.toNumber(),
                  'COP',
                  2
                )
              : undefined,
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

  async findBySpecification(
    spec: IPrismaSpecification<Product>,
    orgId: string,
    options?: IPaginationOptions
  ): Promise<IPaginatedResult<Product>> {
    try {
      const where = spec.toPrismaWhere(orgId);
      const skip = options?.skip;
      const take = options?.take;

      const [productsData, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: { categories: { select: { id: true, name: true } } },
        }),
        this.prisma.product.count({ where }),
      ]);

      const products = productsData.map(productData =>
        Product.reconstitute(
          {
            sku: SKU.reconstitute(productData.sku),
            name: ProductName.reconstitute(productData.name),
            description: productData.description || undefined,
            categories: productData.categories ?? [],
            unit: UnitValueObject.create(productData.unit, productData.unit, 0),
            barcode: productData.barcode || undefined,
            brand: productData.brand || undefined,
            model: productData.model || undefined,
            price: productData.price
              ? Price.create(
                  typeof productData.price === 'number'
                    ? productData.price
                    : productData.price.toNumber(),
                  'COP',
                  2
                )
              : undefined,
            status: ProductStatus.create(productData.isActive ? 'ACTIVE' : 'INACTIVE'),
            costMethod: CostMethod.create((productData.costMethod as 'AVG' | 'FIFO') || 'AVG'),
          },
          productData.id,
          productData.orgId
        )
      );

      return {
        data: products,
        total,
        hasMore: skip !== undefined && take !== undefined ? skip + take < total : false,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding products by specification: ${error.message}`);
      } else {
        this.logger.error(`Error finding products by specification: ${error}`);
      }
      throw error;
    }
  }
}
