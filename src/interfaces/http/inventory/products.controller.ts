import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { GetProductByIdUseCase } from '@application/productUseCases/getProductByIdUseCase';
import { GetProductsUseCase } from '@application/productUseCases/getProductsUseCase';
import { UpdateProductUseCase } from '@application/productUseCases/updateProductUseCase';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateProductDto,
  UpdateProductDto,
  GetProductsQueryDto,
  GetProductsResponseDto,
  GetProductResponseDto,
  CreateProductResponseDto,
  UpdateProductResponseDto,
} from '@product/dto';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

import type { IAuthenticatedUser } from '@shared/types/http.types';
import type { Request } from 'express';

@ApiTags('Inventory - Products')
@Controller('inventory/products')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductByIdUseCase: GetProductByIdUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_CREATE)
  @ApiOperation({
    summary: 'Create new product',
    description: 'Create a new product in the organization. Requires PRODUCTS:CREATE permission.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product created successfully',
    type: CreateProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or product already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<CreateProductResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Creating product', { sku: createProductDto.sku, orgId, createdBy: user.id });

    const request = {
      sku: createProductDto.sku,
      name: createProductDto.name,
      description: createProductDto.description,
      unit: createProductDto.unit,
      barcode: createProductDto.barcode,
      brand: createProductDto.brand,
      model: createProductDto.model,
      status: createProductDto.status,
      costMethod: createProductDto.costMethod,
      orgId,
    };

    const result = await this.createProductUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({
    summary: 'Get all products',
    description:
      'Get a paginated list of products in the organization. Requires PRODUCTS:READ permission.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'sku', 'status', 'createdAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products retrieved successfully',
    type: GetProductsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getProducts(
    @Query() query: GetProductsQueryDto,
    @OrgId() orgId: string
  ): Promise<GetProductsResponseDto> {
    this.logger.log('Getting products', { orgId, ...query });

    const request = {
      orgId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await this.getProductsUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Get a specific product by ID. Requires PRODUCTS:READ permission.',
  })
  @ApiParam({ name: 'id', description: 'Product ID', example: 'product-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product retrieved successfully',
    type: GetProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getProductById(
    @Param('id') productId: string,
    @OrgId() orgId: string
  ): Promise<GetProductResponseDto> {
    this.logger.log('Getting product by ID', { productId, orgId });

    const request = {
      productId,
      orgId,
    };

    const result = await this.getProductByIdUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_UPDATE)
  @ApiOperation({
    summary: 'Update product',
    description: 'Update product information. Requires PRODUCTS:UPDATE permission.',
  })
  @ApiParam({ name: 'id', description: 'Product ID', example: 'product-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully',
    type: UpdateProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async updateProduct(
    @Param('id') productId: string,
    @Body() updateProductDto: UpdateProductDto,
    @OrgId() orgId: string
  ): Promise<UpdateProductResponseDto> {
    this.logger.log('Updating product', { productId, orgId });

    const request = {
      productId,
      orgId,
      name: updateProductDto.name,
      description: updateProductDto.description,
      unit: updateProductDto.unit,
      barcode: updateProductDto.barcode,
      brand: updateProductDto.brand,
      model: updateProductDto.model,
      status: updateProductDto.status,
      costMethod: updateProductDto.costMethod,
    };

    const result = await this.updateProductUseCase.execute(request);
    return resultToHttpResponse(result);
  }
}
