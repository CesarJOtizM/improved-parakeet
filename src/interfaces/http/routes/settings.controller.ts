import { AlertConfigurationResponseDto, UpdateAlertConfigurationDto } from '@auth/dto';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import { PermissionGuard } from '@shared/guards/permission.guard';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';

import type { IOrganizationRepository } from '@organization/domain/repositories';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('OrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository
  ) {}

  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({
    summary: 'Get alert configuration',
    description:
      'Get the stock alert configuration for the current organization. Requires SETTINGS:MANAGE permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert configuration retrieved successfully',
    type: AlertConfigurationResponseDto,
  })
  async getAlertConfiguration(@OrgId() orgId: string): Promise<AlertConfigurationResponseDto> {
    this.logger.log('Getting alert configuration', { orgId });

    let config = await this.prisma.alertConfiguration.findUnique({
      where: { orgId },
    });

    if (!config) {
      config = await this.prisma.alertConfiguration.create({
        data: { orgId },
      });
    }

    return {
      success: true,
      message: 'Alert configuration retrieved successfully',
      data: {
        id: config.id,
        orgId: config.orgId,
        cronFrequency: config.cronFrequency,
        notifyLowStock: config.notifyLowStock,
        notifyCriticalStock: config.notifyCriticalStock,
        notifyOutOfStock: config.notifyOutOfStock,
        recipientEmails: config.recipientEmails,
        isEnabled: config.isEnabled,
        lastRunAt: config.lastRunAt,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Put('alerts')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({
    summary: 'Update alert configuration',
    description:
      'Update the stock alert configuration for the current organization. Requires SETTINGS:MANAGE permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert configuration updated successfully',
    type: AlertConfigurationResponseDto,
  })
  async updateAlertConfiguration(
    @Body() dto: UpdateAlertConfigurationDto,
    @OrgId() orgId: string
  ): Promise<AlertConfigurationResponseDto> {
    this.logger.log('Updating alert configuration', { orgId });

    const config = await this.prisma.alertConfiguration.upsert({
      where: { orgId },
      create: {
        orgId,
        cronFrequency: dto.cronFrequency ?? 'EVERY_HOUR',
        notifyLowStock: dto.notifyLowStock ?? true,
        notifyCriticalStock: dto.notifyCriticalStock ?? true,
        notifyOutOfStock: dto.notifyOutOfStock ?? true,
        recipientEmails: dto.recipientEmails ?? '',
        isEnabled: dto.isEnabled ?? true,
      },
      update: {
        ...(dto.cronFrequency !== undefined && { cronFrequency: dto.cronFrequency }),
        ...(dto.notifyLowStock !== undefined && { notifyLowStock: dto.notifyLowStock }),
        ...(dto.notifyCriticalStock !== undefined && {
          notifyCriticalStock: dto.notifyCriticalStock,
        }),
        ...(dto.notifyOutOfStock !== undefined && { notifyOutOfStock: dto.notifyOutOfStock }),
        ...(dto.recipientEmails !== undefined && { recipientEmails: dto.recipientEmails }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
      },
    });

    return {
      success: true,
      message: 'Alert configuration updated successfully',
      data: {
        id: config.id,
        orgId: config.orgId,
        cronFrequency: config.cronFrequency,
        notifyLowStock: config.notifyLowStock,
        notifyCriticalStock: config.notifyCriticalStock,
        notifyOutOfStock: config.notifyOutOfStock,
        recipientEmails: config.recipientEmails,
        isEnabled: config.isEnabled,
        lastRunAt: config.lastRunAt,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('picking')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({
    summary: 'Get picking configuration',
    description: 'Get the picking verification mode for the current organization.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Picking configuration retrieved' })
  async getPickingConfig(@OrgId() orgId: string) {
    const org = await this.organizationRepository.findById(orgId);
    const pickingMode = (org?.getSetting('pickingMode') as string) ?? 'OFF';
    const pickingEnabled = !!org?.getSetting('pickingEnabled');

    return {
      success: true,
      message: 'Picking configuration retrieved successfully',
      data: { pickingMode, pickingEnabled },
      timestamp: new Date().toISOString(),
    };
  }

  @Put('picking')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({
    summary: 'Update picking configuration',
    description: 'Update the picking verification mode for the current organization.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Picking configuration updated' })
  async updatePickingConfig(
    @Body() body: { pickingMode?: string; pickingEnabled?: boolean },
    @OrgId() orgId: string
  ) {
    const org = await this.organizationRepository.findById(orgId);
    if (!org) {
      return {
        success: false,
        message: 'Organization not found',
        timestamp: new Date().toISOString(),
      };
    }

    // Update pickingEnabled if provided
    if (body.pickingEnabled !== undefined) {
      org.setSetting('pickingEnabled', body.pickingEnabled);
    }

    // Update pickingMode if provided
    if (body.pickingMode !== undefined) {
      const validModes = ['OFF', 'OPTIONAL', 'REQUIRED_FULL', 'REQUIRED_PARTIAL'];
      const mode = validModes.includes(body.pickingMode) ? body.pickingMode : 'OFF';
      org.setSetting('pickingMode', mode);
    }

    await this.organizationRepository.update(org);

    const pickingEnabled = !!org.getSetting('pickingEnabled');
    const pickingMode = (org.getSetting('pickingMode') as string) ?? 'OFF';

    return {
      success: true,
      message: 'Picking configuration updated',
      data: { pickingMode, pickingEnabled },
      timestamp: new Date().toISOString(),
    };
  }
}
