import { Injectable, Logger } from '@nestjs/common';
import { ResilientCall } from '@shared/infrastructure/resilience';

import type { IEmailRequest, IEmailResponse, IEmailService } from '@shared/ports/externalServices';
export type { IEmailRequest, IEmailResponse, IEmailService } from '@shared/ports/externalServices';

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resilientSend = new ResilientCall({
    name: 'EmailService',
    timeoutMs: 10_000,
    retry: { maxAttempts: 3, initialDelay: 500 },
    circuitBreaker: { failureThreshold: 5, resetTimeout: 60_000 },
  });

  /**
   * Envía un email con resilience (circuit breaker + retry + timeout)
   */
  async sendEmail(request: IEmailRequest): Promise<IEmailResponse> {
    try {
      return await this.resilientSend.execute(async () => {
        this.logger.log('Email Service - Sending email', {
          to: request.to,
          subject: request.subject,
          template: request.template,
          orgId: request.orgId,
          timestamp: new Date().toISOString(),
        });

        // TODO: Replace with real email provider (SendGrid, SES, etc.)
        await new Promise(resolve => setTimeout(resolve, 100));
        const messageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.logger.log('Email sent successfully', {
          messageId,
          to: request.to,
          subject: request.subject,
        });

        return { success: true, messageId } satisfies IEmailResponse;
      });
    } catch (error) {
      this.logger.error('Error sending email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: request.to,
        subject: request.subject,
        orgId: request.orgId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sends welcome email for new user
   */
  async sendWelcomeEmail(
    email: string,
    firstName: string,
    lastName: string,
    orgId: string
  ): Promise<IEmailResponse> {
    const request: IEmailRequest = {
      to: email,
      subject: 'Welcome to the Inventory System',
      body: `Hello ${firstName} ${lastName}, your account has been created successfully.`,
      template: 'welcome',
      variables: {
        firstName,
        lastName,
        email,
        activationUrl: `https://app.inventory.com/activate?email=${encodeURIComponent(email)}`,
      },
      orgId,
    };

    return this.sendEmail(request);
  }

  /**
   * Sends new user notification email to admin
   */
  async sendNewUserNotificationToAdmin(
    adminEmail: string,
    newUserEmail: string,
    firstName: string,
    lastName: string,
    orgId: string
  ): Promise<IEmailResponse> {
    const request: IEmailRequest = {
      to: adminEmail,
      subject: 'New User Registered - Requires Activation',
      body: `A new user has registered: ${firstName} ${lastName} (${newUserEmail})`,
      template: 'new-user-notification',
      variables: {
        newUserEmail,
        firstName,
        lastName,
        activationUrl: `https://admin.inventory.com/users/activate?email=${encodeURIComponent(newUserEmail)}`,
      },
      orgId,
    };

    return this.sendEmail(request);
  }

  /**
   * Sends account activation email
   */
  async sendAccountActivationEmail(
    email: string,
    firstName: string,
    lastName: string,
    orgId: string
  ): Promise<IEmailResponse> {
    const request: IEmailRequest = {
      to: email,
      subject: 'Your account has been activated',
      body: `Hello ${firstName} ${lastName}, your account has been activated by the administrator.`,
      template: 'account-activated',
      variables: {
        firstName,
        lastName,
        loginUrl: 'https://app.inventory.com/login',
      },
      orgId,
    };

    return this.sendEmail(request);
  }

  /**
   * Sends password reset OTP email
   */
  async sendPasswordResetOtpEmail(
    email: string,
    firstName: string,
    lastName: string,
    otpCode: string,
    orgId: string,
    expiryMinutes: number = 15
  ): Promise<IEmailResponse> {
    const request: IEmailRequest = {
      to: email,
      subject: 'Password Reset Code - Inventory System',
      body: `Hello ${firstName} ${lastName}, you have requested a password reset. Your verification code is: ${otpCode}`,
      template: 'password-reset-otp',
      variables: {
        firstName,
        lastName,
        otpCode,
        expiryMinutes,
        resetUrl: `https://app.inventory.com/reset-password?email=${encodeURIComponent(email)}`,
        supportEmail: 'support@inventory.com',
      },
      orgId,
    };

    return this.sendEmail(request);
  }
}
