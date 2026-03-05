import { CreateCompanyUseCase } from '@application/companyUseCases/createCompanyUseCase';
import { DeleteCompanyUseCase } from '@application/companyUseCases/deleteCompanyUseCase';
import { GetCompaniesUseCase } from '@application/companyUseCases/getCompaniesUseCase';
import { GetCompanyByIdUseCase } from '@application/companyUseCases/getCompanyByIdUseCase';
import { UpdateCompanyUseCase } from '@application/companyUseCases/updateCompanyUseCase';
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
import { CreateCompanyDto, GetCompaniesQueryDto, UpdateCompanyDto } from '@inventory/companies/dto';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@ApiTags('Inventory - Companies')
@Controller('inventory/companies')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class CompaniesController {
  private readonly logger = new Logger(CompaniesController.name);

  constructor(
    private readonly getCompaniesUseCase: GetCompaniesUseCase,
    private readonly getCompanyByIdUseCase: GetCompanyByIdUseCase,
    private readonly createCompanyUseCase: CreateCompanyUseCase,
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
    private readonly deleteCompanyUseCase: DeleteCompanyUseCase
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.COMPANIES_READ)
  @ApiOperation({ summary: 'Get all companies' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'code', 'isActive', 'productCount', 'createdAt', 'updatedAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Companies retrieved successfully' })
  async getCompanies(@Query() query: GetCompaniesQueryDto, @OrgId() orgId: string) {
    this.logger.log('Getting companies', { orgId, ...query });

    const result = await this.getCompaniesUseCase.execute({
      orgId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      isActive: query.isActive,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return resultToHttpResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.COMPANIES_READ)
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Company retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Company not found' })
  async getCompanyById(@Param('id') companyId: string, @OrgId() orgId: string) {
    this.logger.log('Getting company by ID', { companyId, orgId });

    const result = await this.getCompanyByIdUseCase.execute({ companyId, orgId });
    return resultToHttpResponse(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.COMPANIES_CREATE)
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Company created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Company code or name already exists' })
  async createCompany(@Body() dto: CreateCompanyDto, @OrgId() orgId: string) {
    this.logger.log('Creating company', { name: dto.name, orgId });

    const result = await this.createCompanyUseCase.execute({
      name: dto.name,
      code: dto.code,
      description: dto.description,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.COMPANIES_UPDATE)
  @ApiOperation({ summary: 'Update a company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Company updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Company not found' })
  async updateCompany(
    @Param('id') companyId: string,
    @Body() dto: UpdateCompanyDto,
    @OrgId() orgId: string
  ) {
    this.logger.log('Updating company', { companyId, orgId });

    const result = await this.updateCompanyUseCase.execute({
      companyId,
      orgId,
      name: dto.name,
      code: dto.code,
      description: dto.description,
      isActive: dto.isActive,
    });

    return resultToHttpResponse(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.COMPANIES_DELETE)
  @ApiOperation({ summary: 'Delete a company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Company deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Company not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Company has associated products',
  })
  async deleteCompany(@Param('id') companyId: string, @OrgId() orgId: string) {
    this.logger.log('Deleting company', { companyId, orgId });

    const result = await this.deleteCompanyUseCase.execute({ companyId, orgId });
    return resultToHttpResponse(result);
  }
}
