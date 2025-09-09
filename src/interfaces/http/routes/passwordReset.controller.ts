import { RequestPasswordResetUseCase } from '@application/authUseCases/requestPasswordResetUseCase';
import { ResetPasswordUseCase } from '@application/authUseCases/resetPasswordUseCase';
import { VerifyOtpUseCase } from '@application/authUseCases/verifyOtpUseCase';
import { RequestPasswordResetDto, ResetPasswordDto, VerifyOtpDto } from '@auth/dto';
import { Public, RateLimited } from '@auth/security/decorators/auth.decorators';
import { Body, Controller, Headers, HttpCode, HttpStatus, Ip, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrgId } from '@shared/decorators/orgId.decorator';

import type {
  IRequestPasswordResetRequest,
  IRequestPasswordResetResponse,
} from '@application/authUseCases/requestPasswordResetUseCase';
import type {
  IResetPasswordRequest,
  IResetPasswordResponse,
} from '@application/authUseCases/resetPasswordUseCase';
import type {
  IVerifyOtpRequest,
  IVerifyOtpResponse,
} from '@application/authUseCases/verifyOtpUseCase';

@ApiTags('Password Reset')
@Controller('password-reset')
export class PasswordResetController {
  private readonly logger = new Logger(PasswordResetController.name);

  constructor(
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly verifyOtpUseCase: VerifyOtpUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase
  ) {}

  @Post('request')
  @Public()
  @RateLimited('IP')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password recovery',
    description: 'Sends an OTP code to the user email to recover their password',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        email: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiadas solicitudes',
  })
  async requestPasswordReset(
    @Body() requestDto: RequestPasswordResetDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @OrgId() orgId: string
  ): Promise<IRequestPasswordResetResponse> {
    this.logger.log(`Password reset request from IP: ${ipAddress} for org: ${orgId}`);

    const request: IRequestPasswordResetRequest = {
      email: requestDto.email,
      orgId,
      ipAddress,
      userAgent,
    };

    return this.requestPasswordResetUseCase.execute(request);
  }

  @Post('verify-otp')
  @Public()
  @RateLimited('IP')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP code',
    description: 'Verifies the OTP code sent by email',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        isValid: { type: 'boolean' },
        email: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        attemptsRemaining: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiadas solicitudes',
  })
  async verifyOtp(
    @Body() verifyDto: VerifyOtpDto,
    @Ip() ipAddress: string,
    @OrgId() orgId: string
  ): Promise<IVerifyOtpResponse> {
    this.logger.log(`OTP verification attempt from IP: ${ipAddress} for org: ${orgId}`);

    const request: IVerifyOtpRequest = {
      email: verifyDto.email,
      otpCode: verifyDto.otpCode,
      orgId,
    };

    return this.verifyOtpUseCase.execute(request);
  }

  @Post('reset')
  @Public()
  @RateLimited('IP')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets the user password using the verified OTP code',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        email: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid OTP code or password does not meet requirements',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Demasiadas solicitudes',
  })
  async resetPassword(
    @Body() resetDto: ResetPasswordDto,
    @Ip() ipAddress: string,
    @OrgId() orgId: string
  ): Promise<IResetPasswordResponse> {
    this.logger.log(`Password reset attempt from IP: ${ipAddress} for org: ${orgId}`);

    const request: IResetPasswordRequest = {
      email: resetDto.email,
      otpCode: resetDto.otpCode,
      newPassword: resetDto.newPassword,
      confirmPassword: resetDto.confirmPassword,
      orgId,
    };

    return this.resetPasswordUseCase.execute(request);
  }
}
