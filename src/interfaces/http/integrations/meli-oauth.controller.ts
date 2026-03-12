import {
  Inject,
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import { PermissionGuard } from '@shared/guards/permission.guard';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { EncryptionService } from '@integrations/shared/encryption/encryption.service';
import { MeliExchangeAuthCodeUseCase } from '@integrations/mercadolibre/application/meliExchangeAuthCodeUseCase';

import type { IIntegrationConnectionRepository } from '@integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

const MELI_AUTH_BASE = 'https://auth.mercadolibre.com/authorization';

@ApiTags('MercadoLibre OAuth')
@Controller('integrations/meli')
export class MeliOAuthController {
  private readonly logger = new Logger(MeliOAuthController.name);

  constructor(
    @Inject('IntegrationConnectionRepository')
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly encryptionService: EncryptionService,
    private readonly meliExchangeAuthCodeUseCase: MeliExchangeAuthCodeUseCase
  ) {}

  @Post('auth-url')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
  @UseInterceptors(AuditInterceptor)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_SYNC)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate MercadoLibre OAuth authorization URL' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Auth URL generated' })
  async getAuthUrl(
    @Body() dto: { connectionId: string; redirectUri: string },
    @OrgId() orgId: string
  ) {
    this.logger.log('Generating MeLi auth URL', { connectionId: dto.connectionId, orgId });

    const connection = await this.connectionRepository.findById(dto.connectionId, orgId);
    if (!connection) {
      return { success: false, message: 'Connection not found' };
    }

    const clientId = this.encryptionService.decrypt(connection.encryptedAppKey);
    const backendCallbackUrl = `${process.env.APP_BASE_URL || ''}/integrations/meli/callback`;
    const state = `${dto.connectionId}:${orgId}:${encodeURIComponent(dto.redirectUri)}`;

    const authUrl =
      `${MELI_AUTH_BASE}?response_type=code` +
      `&client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(backendCallbackUrl)}` +
      `&state=${encodeURIComponent(state)}`;

    return {
      success: true,
      message: 'Auth URL generated',
      data: { authUrl },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MercadoLibre OAuth callback (public)' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    this.logger.log('Received MeLi OAuth callback');

    try {
      const [connectionId, orgId, encodedRedirectUri] = state.split(':');
      const frontendRedirectUrl = decodeURIComponent(encodedRedirectUri);
      const backendCallbackUrl = `${process.env.APP_BASE_URL || ''}/integrations/meli/callback`;

      const result = await this.meliExchangeAuthCodeUseCase.execute({
        connectionId,
        authCode: code,
        redirectUri: backendCallbackUrl,
        orgId,
      });

      if (result.isOk()) {
        const separator = frontendRedirectUrl.includes('?') ? '&' : '?';
        return res.redirect(`${frontendRedirectUrl}${separator}meli_connected=true`);
      } else {
        const separator = frontendRedirectUrl.includes('?') ? '&' : '?';
        return res.redirect(
          `${frontendRedirectUrl}${separator}meli_error=${encodeURIComponent(result.unwrapErr().message)}`
        );
      }
    } catch (error) {
      this.logger.error('MeLi OAuth callback error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'OAuth callback failed',
      });
    }
  }
}
