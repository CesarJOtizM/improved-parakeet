import { Inject, Injectable, Logger } from '@nestjs/common';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { IProductData } from './createProductUseCase';
import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';

export interface IGetProductsRequest {
  orgId: string;
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type IGetProductsResponse = IPaginatedResponse<IProductData>;

@Injectable()
export class GetProductsUseCase {
  private readonly logger = new Logger(GetProductsUseCase.name);

  constructor(
    @Inject('ProductRepository') private readonly productRepository: IProductRepository
  ) {}

  async execute(request: IGetProductsRequest): Promise<IGetProductsResponse> {
    this.logger.log('Getting products', {
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
      status: request.status,
      search: request.search,
    });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const skip = (page - 1) * limit;

    // Get products based on filters
    let products;
    if (request.status) {
      products = await this.productRepository.findByStatus(request.status, request.orgId);
    } else {
      products = await this.productRepository.findAll(request.orgId);
    }

    // Apply search filter if provided
    if (request.search) {
      const searchLower = request.search.toLowerCase();
      products = products.filter(
        product =>
          product.name.getValue().toLowerCase().includes(searchLower) ||
          product.sku.getValue().toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      products.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'name':
            aValue = a.name.getValue();
            bValue = b.name.getValue();
            break;
          case 'sku':
            aValue = a.sku.getValue();
            bValue = b.sku.getValue();
            break;
          case 'status':
            aValue = a.status.getValue();
            bValue = b.status.getValue();
            break;
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          default:
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    const total = products.length;
    const paginatedProducts = products.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Products retrieved successfully',
      data: paginatedProducts.map(product => ({
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
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
