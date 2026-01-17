import { CreateOrganizationUseCase } from '@application/organizationUseCases/createOrganizationUseCase';
import { GetOrganizationByIdUseCase } from '@application/organizationUseCases/getOrganizationByIdUseCase';
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
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateOrganizationDto,
  CreateOrganizationResponseDto,
  GetOrganizationResponseDto,
} from '@organization/dto';
import { SYSTEM_ROLES } from '@shared/constants/security.constants';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@ApiTags('Organization')
@Controller('organizations')
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly getOrganizationByIdUseCase: GetOrganizationByIdUseCase
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
      createInitialData: createOrganizationDto.createInitialData || false,
    });

    const result = await this.createOrganizationUseCase.execute({
      name: createOrganizationDto.name,
      slug: createOrganizationDto.slug,
      domain: createOrganizationDto.domain,
      timezone: createOrganizationDto.timezone,
      currency: createOrganizationDto.currency,
      dateFormat: createOrganizationDto.dateFormat,
      createInitialData: createOrganizationDto.createInitialData || false,
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
}
