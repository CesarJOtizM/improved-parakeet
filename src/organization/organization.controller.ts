import { CreateOrganizationUseCase } from '@application/organizationUseCases/createOrganizationUseCase';
import { GetOrganizationByIdUseCase } from '@application/organizationUseCases/getOrganizationByIdUseCase';
import { ToggleMultiCompanySettingUseCase } from '@application/organizationUseCases/toggleMultiCompanySettingUseCase';
import { TogglePickingSettingUseCase } from '@application/organizationUseCases/togglePickingSettingUseCase';
import { UpdateOrganizationUseCase } from '@application/organizationUseCases/updateOrganizationUseCase';
import { RequireRoles } from '@auth/security/decorators/roleBasedAuth.decorator';
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
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateOrganizationDto,
  CreateOrganizationResponseDto,
  GetOrganizationResponseDto,
  UpdateOrganizationDto,
  UpdateOrganizationResponseDto,
} from '@organization/dto';
import { SYSTEM_ROLES } from '@shared/constants/security.constants';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@ApiTags('Organization')
@Controller('organizations')
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly getOrganizationByIdUseCase: GetOrganizationByIdUseCase,
    private readonly updateOrganizationUseCase: UpdateOrganizationUseCase,
    private readonly togglePickingSettingUseCase: TogglePickingSettingUseCase,
    private readonly toggleMultiCompanySettingUseCase: ToggleMultiCompanySettingUseCase
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
  @RequireRoles([SYSTEM_ROLES.SYSTEM_ADMIN], { checkOrganization: false })
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create new organization',
    description:
      'Creates a new multi-tenant organization with roles, permissions, and optionally an admin user and initial inventory data. Only super-admins can create organizations.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Organization created successfully',
    type: CreateOrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or slug/domain already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions. Only super-admins can create organizations.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User authentication required',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  })
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto
  ): Promise<CreateOrganizationResponseDto> {
    this.logger.log('Creating organization request', {
      name: createOrganizationDto.name,
      slug: createOrganizationDto.slug,
      hasAdminUser: !!createOrganizationDto.adminUser,
    });

    const result = await this.createOrganizationUseCase.execute({
      name: createOrganizationDto.name,
      slug: createOrganizationDto.slug,
      domain: createOrganizationDto.domain,
      timezone: createOrganizationDto.timezone,
      currency: createOrganizationDto.currency,
      dateFormat: createOrganizationDto.dateFormat,
      adminUser: createOrganizationDto.adminUser
        ? {
            email: createOrganizationDto.adminUser.email,
            username: createOrganizationDto.adminUser.username,
            password: createOrganizationDto.adminUser.password,
            firstName: createOrganizationDto.adminUser.firstName,
            lastName: createOrganizationDto.adminUser.lastName,
          }
        : undefined,
    });

    const response = resultToHttpResponse(result);

    this.logger.log('Organization created successfully', {
      organizationId: response.data.id,
      slug: response.data.slug,
    });

    return response;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
  @RequireRoles([SYSTEM_ROLES.SYSTEM_ADMIN], { checkOrganization: false })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get organization by ID or slug',
    description:
      'Get a specific organization by ID or slug. The endpoint accepts both organization ID (CUID format) and organization slug. Only super-admins can access organizations.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID (CUID) or slug',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization retrieved successfully',
    type: GetOrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions. Only super-admins can access organizations.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User authentication required',
  })
  async getOrganizationById(@Param('id') identifier: string): Promise<GetOrganizationResponseDto> {
    this.logger.log('Getting organization by identifier request', { identifier });

    const result = await this.getOrganizationByIdUseCase.execute({
      identifier,
    });

    const response = resultToHttpResponse(result);

    this.logger.log('Organization retrieved successfully', {
      organizationId: response.data.id,
      slug: response.data.slug,
    });

    return response;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
  @RequireRoles([SYSTEM_ROLES.SYSTEM_ADMIN], { checkOrganization: false })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update organization',
    description:
      'Update an existing organization. Only super-admins can update organizations. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID (CUID)',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization updated successfully',
    type: UpdateOrganizationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or slug/domain already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions. Only super-admins can update organizations.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User authentication required',
  })
  async updateOrganization(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto
  ): Promise<UpdateOrganizationResponseDto> {
    this.logger.log('Updating organization request', {
      organizationId: id,
      fields: Object.keys(updateOrganizationDto),
    });

    const result = await this.updateOrganizationUseCase.execute({
      id,
      ...updateOrganizationDto,
    });

    const response = resultToHttpResponse(result);

    this.logger.log('Organization updated successfully', {
      organizationId: response.data.id,
      slug: response.data.slug,
    });

    return response;
  }

  @Patch(':id/settings/picking')
  @UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
  @RequireRoles([SYSTEM_ROLES.SYSTEM_ADMIN], { checkOrganization: false })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Toggle picking setting',
    description:
      'Enable or disable the picking/shipping workflow for an organization. Only super-admins can change this setting.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID (CUID)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Picking setting updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions. Only super-admins can change this setting.',
  })
  async togglePickingSetting(
    @Param('id') id: string,
    @Body() body: { pickingEnabled?: boolean; pickingMode?: string }
  ) {
    this.logger.log('Updating picking setting', {
      organizationId: id,
      pickingMode: body.pickingMode,
      pickingEnabled: body.pickingEnabled,
    });

    const result = await this.togglePickingSettingUseCase.execute({
      orgId: id,
      pickingEnabled: body.pickingEnabled,
      pickingMode: body.pickingMode as 'OFF' | 'OPTIONAL' | 'REQUIRED_FULL' | 'REQUIRED_PARTIAL',
    });

    return resultToHttpResponse(result);
  }

  @Patch(':id/settings/multi-company')
  @UseGuards(JwtAuthGuard, RoleBasedAuthGuard)
  @RequireRoles([SYSTEM_ROLES.SYSTEM_ADMIN], { checkOrganization: false })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Toggle multi-company setting',
    description:
      'Enable or disable the multi-company (business lines) feature for an organization. Only super-admins can change this setting.',
  })
  @ApiParam({
    name: 'id',
    description: 'Organization ID (CUID)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Multi-company setting updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
  })
  async toggleMultiCompanySetting(
    @Param('id') id: string,
    @Body() body: { multiCompanyEnabled: boolean }
  ) {
    this.logger.log('Toggling multi-company setting', {
      organizationId: id,
      multiCompanyEnabled: body.multiCompanyEnabled,
    });

    const result = await this.toggleMultiCompanySettingUseCase.execute({
      orgId: id,
      multiCompanyEnabled: body.multiCompanyEnabled,
    });

    return resultToHttpResponse(result);
  }
}
