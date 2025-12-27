import { CreateOrganizationUseCase } from '@application/organizationUseCases/createOrganizationUseCase';
import { RequireRoles } from '@auth/security/decorators/roleBasedAuth.decorator';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrganizationDto, CreateOrganizationResponseDto } from '@organization/dto';
import { SYSTEM_ROLES } from '@shared/constants/security.constants';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@ApiTags('Organization')
@Controller('organizations')
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(private readonly createOrganizationUseCase: CreateOrganizationUseCase) {}

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
}
