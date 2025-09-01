import { Injectable, Logger } from '@nestjs/common';

export interface IEmailRequest {
  to: string;
  subject: string;
  body: string;
  template?: string;
  variables?: Record<string, unknown>;
  orgId: string;
}

export interface IEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Envía un email (mock - solo hace logs)
   */
  async sendEmail(request: IEmailRequest): Promise<IEmailResponse> {
    try {
      this.logger.log('📧 Email Service - Sending email (MOCK)', {
        to: request.to,
        subject: request.subject,
        template: request.template,
        variables: request.variables,
        orgId: request.orgId,
        timestamp: new Date().toISOString(),
      });

      // Simular delay de envío
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simular éxito del envío
      const messageId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log('✅ Email sent successfully (MOCK)', {
        messageId,
        to: request.to,
        subject: request.subject,
      });

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error('❌ Error sending email (MOCK)', {
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
