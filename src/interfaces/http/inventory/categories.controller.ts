import { CreateCategoryUseCase } from '@application/categoryUseCases/createCategoryUseCase';
import { DeleteCategoryUseCase } from '@application/categoryUseCases/deleteCategoryUseCase';
import { GetCategoriesUseCase } from '@application/categoryUseCases/getCategoriesUseCase';
import { GetCategoryByIdUseCase } from '@application/categoryUseCases/getCategoryByIdUseCase';
import { UpdateCategoryUseCase } from '@application/categoryUseCases/updateCategoryUseCase';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import { PermissionGuard } from '@shared/guards/permission.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
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
import { CreateCategoryDto, GetCategoriesQueryDto, UpdateCategoryDto } from '@product/dto';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@ApiTags('Inventory - Categories')
@Controller('inventory/categories')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(
    private readonly getCategoriesUseCase: GetCategoriesUseCase,
    private readonly getCategoryByIdUseCase: GetCategoryByIdUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'parentId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'isActive', 'productCount', 'createdAt', 'updatedAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Categories retrieved successfully' })
  async getCategories(@Query() query: GetCategoriesQueryDto, @OrgId() orgId: string) {
    this.logger.log('Getting categories', { orgId, ...query });

    const result = await this.getCategoriesUseCase.execute({
      orgId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      parentId: query.parentId,
      isActive: query.isActive,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return resultToHttpResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_READ)
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  async getCategoryById(@Param('id') categoryId: string, @OrgId() orgId: string) {
    this.logger.log('Getting category by ID', { categoryId, orgId });

    const result = await this.getCategoryByIdUseCase.execute({ categoryId, orgId });
    return resultToHttpResponse(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_CREATE)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Category created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Category name already exists' })
  async createCategory(@Body() dto: CreateCategoryDto, @OrgId() orgId: string) {
    this.logger.log('Creating category', { name: dto.name, orgId });

    const result = await this.createCategoryUseCase.execute({
      name: dto.name,
      description: dto.description,
      parentId: dto.parentId,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_UPDATE)
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  async updateCategory(
    @Param('id') categoryId: string,
    @Body() dto: UpdateCategoryDto,
    @OrgId() orgId: string
  ) {
    this.logger.log('Updating category', { categoryId, orgId });

    const result = await this.updateCategoryUseCase.execute({
      categoryId,
      orgId,
      name: dto.name,
      description: dto.description,
      parentId: dto.parentId,
      isActive: dto.isActive,
    });

    return resultToHttpResponse(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.PRODUCTS_DELETE)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Category has subcategories or products',
  })
  async deleteCategory(@Param('id') categoryId: string, @OrgId() orgId: string) {
    this.logger.log('Deleting category', { categoryId, orgId });

    const result = await this.deleteCategoryUseCase.execute({ categoryId, orgId });
    return resultToHttpResponse(result);
  }
}
