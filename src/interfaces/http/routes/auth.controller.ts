import { LoginUseCase } from '@application/authUseCases/loginUseCase';
import { LogoutUseCase } from '@application/authUseCases/logoutUseCase';
import { RefreshTokenUseCase } from '@application/authUseCases/refreshTokenUseCase';
import { Public, RateLimited } from '@auth/security/decorators/auth.decorators';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrgId } from '@shared/decorators/orgId.decorator';

import type { ILoginRequest, ILoginResponse } from '@application/authUseCases/loginUseCase';
import type { ILogoutRequest, ILogoutResponse } from '@application/authUseCases/logoutUseCase';
import type {
  IRefreshTokenRequest,
  IRefreshTokenResponse,
} from '@application/authUseCases/refreshTokenUseCase';
import type { Request } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase
  ) {}

  @Post('login')
  @Public()
  @RateLimited('IP')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password, returns JWT tokens',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            name: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        accessTokenExpiresAt: { type: 'string', format: 'date-time' },
        refreshTokenExpiresAt: { type: 'string', format: 'date-time' },
        sessionId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or account locked',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async login(
    @Body() loginRequest: ILoginRequest,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @OrgId() orgId: string
  ): Promise<ILoginResponse> {
    this.logger.log(`Login attempt from IP: ${ipAddress} for org: ${orgId}`);

    const request: ILoginRequest = {
      ...loginRequest,
      orgId,
      ipAddress,
      userAgent,
    };

    return this.loginUseCase.execute(request);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout user and blacklist JWT tokens',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        blacklistedTokens: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token',
  })
  async logout(
    @Body() logoutRequest: ILogoutRequest,
    @Req() req: Request,
    @Ip() ipAddress: string
  ): Promise<ILogoutResponse> {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    this.logger.log(`Logout request for user: ${req.user.id}`);

    const request: ILogoutRequest = {
      ...logoutRequest,
      userId: req.user.id,
      orgId: req.user.orgId,
      ipAddress,
    };

    return this.logoutUseCase.execute(request);
  }

  @Post('refresh')
  @Public()
  @RateLimited('IP')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Refresh access token using valid refresh token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        accessTokenExpiresAt: { type: 'string', format: 'date-time' },
        refreshTokenExpiresAt: { type: 'string', format: 'date-time' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            name: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async refreshToken(
    @Body() refreshRequest: IRefreshTokenRequest,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string
  ): Promise<IRefreshTokenResponse> {
    this.logger.log(`Token refresh attempt from IP: ${ipAddress}`);

    const request: IRefreshTokenRequest = {
      ...refreshRequest,
      ipAddress,
      userAgent,
    };

    return this.refreshTokenUseCase.execute(request);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout all sessions',
    description: 'Logout user from all active sessions and blacklist all tokens',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All sessions logged out successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        blacklistedTokens: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token',
  })
  async logoutAllSessions(@Req() req: Request, @Ip() ipAddress: string): Promise<ILogoutResponse> {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    this.logger.log(`Logout all sessions request for user: ${req.user.id}`);

    const request: ILogoutRequest = {
      accessToken: req.headers.authorization?.replace('Bearer ', '') || '',
      userId: req.user.id,
      orgId: req.user.orgId,
      ipAddress,
      reason: 'SECURITY',
    };

    return this.logoutUseCase.execute(request);
  }
}
