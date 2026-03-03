import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { ResilientCall } from '@shared/infrastructure/resilience';
import { welcomeTemplate } from './templates/welcome.template';
import { passwordResetTemplate } from './templates/passwordReset.template';
import { accountActivationTemplate } from './templates/accountActivation.template';
import { adminNotificationTemplate } from './templates/adminNotification.template';
import { welcomeWithCredentialsTemplate } from './templates/welcomeWithCredentials.template';
import { accountDeactivationTemplate } from './templates/accountDeactivation.template';

import type { IEmailRequest, IEmailResponse, IEmailService } from '@shared/ports/externalServices';
export type { IEmailRequest, IEmailResponse, IEmailService } from '@shared/ports/externalServices';

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly resilientSend = new ResilientCall({
    name: 'EmailService',
    timeoutMs: 10_000,
    retry: { maxAttempts: 3, initialDelay: 500 },
    circuitBreaker: { failureThreshold: 5, resetTimeout: 60_000 },
  });

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>(
      'RESEND_FROM_EMAIL',
      'Nevada Inventory <onboarding@resend.dev>'
    );

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY not configured — emails will be logged but not sent');
    }
  }

  async sendEmail(request: IEmailRequest): Promise<IEmailResponse> {
    try {
      return await this.resilientSend.execute(async () => {
        this.logger.log('Sending email', {
          to: request.to,
          subject: request.subject,
          template: request.template,
          orgId: request.orgId,
        });

        if (!this.resend) {
          const mockId = `mock_${Date.now()}`;
          this.logger.warn('Email not sent (no API key)', {
            to: request.to,
            subject: request.subject,
            mockId,
          });
          return { success: true, messageId: mockId } satisfies IEmailResponse;
        }

        const idempotencyKey = `${request.template || 'generic'}/${request.orgId}/${Date.now()}`;

        const { data, error } = await this.resend.emails.send({
          from: this.fromEmail,
          to: [request.to],
          subject: request.subject,
          html: request.body,
          headers: {
            'X-Idempotency-Key': idempotencyKey,
          },
          tags: [
            { name: 'template', value: request.template || 'generic' },
            { name: 'org_id', value: request.orgId },
          ],
        });

        if (error) {
          this.logger.error('Resend API error', { error, to: request.to });
          return { success: false, error: error.message };
        }

        this.logger.log('Email sent successfully', {
          messageId: data?.id,
          to: request.to,
          subject: request.subject,
        });

        return { success: true, messageId: data?.id } satisfies IEmailResponse;
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

  async sendWelcomeEmail(
    email: string,
    firstName: string,
    lastName: string,
    orgId: string
  ): Promise<IEmailResponse> {
    const html = welcomeTemplate({
      firstName,
      lastName,
      email,
      loginUrl: `https://app.nevadainventory.com/login`,
    });

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Nevada Inventory',
      body: html,
      template: 'welcome',
      variables: { firstName, lastName, email },
      orgId,
    });
  }

  async sendNewUserNotificationToAdmin(
    adminEmail: string,
    newUserEmail: string,
    firstName: string,
    lastName: string,
    orgId: string
  ): Promise<IEmailResponse> {
    const html = adminNotificationTemplate({
      newUserEmail,
      firstName,
      lastName,
      activationUrl: `https://app.nevadainventory.com/dashboard/users`,
    });

    return this.sendEmail({
      to: adminEmail,
      subject: 'New User Registered - Requires Activation',
      body: html,
      template: 'admin-notification',
      variables: { newUserEmail, firstName, lastName },
      orgId,
    });
  }

  async sendAccountActivationEmail(
    email: string,
    firstName: string,
    lastName: string,
    orgId: string
  ): Promise<IEmailResponse> {
    const html = accountActivationTemplate({
      firstName,
      lastName,
      loginUrl: 'https://app.nevadainventory.com/login',
    });

    return this.sendEmail({
      to: email,
      subject: 'Your account has been activated',
      body: html,
      template: 'account-activated',
      variables: { firstName, lastName },
      orgId,
    });
  }

  async sendPasswordResetOtpEmail(
    email: string,
    firstName: string,
    lastName: string,
    otpCode: string,
    orgId: string,
    expiryMinutes: number = 15
  ): Promise<IEmailResponse> {
    const html = passwordResetTemplate({
      firstName,
      lastName,
      otpCode,
      expiryMinutes,
    });

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Code - Nevada Inventory',
      body: html,
      template: 'password-reset-otp',
      variables: { firstName, lastName, otpCode, expiryMinutes },
      orgId,
    });
  }

  async sendWelcomeWithCredentialsEmail(
    email: string,
    firstName: string,
    lastName: string,
    temporaryPassword: string,
    orgId: string
  ): Promise<IEmailResponse> {
    const html = welcomeWithCredentialsTemplate({
      firstName,
      lastName,
      email,
      temporaryPassword,
      loginUrl: 'https://app.nevadainventory.com/login',
    });

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Nevada Inventory - Your Account Credentials',
      body: html,
      template: 'welcome-with-credentials',
      variables: { firstName, lastName, email },
      orgId,
    });
  }

  async sendAccountDeactivationEmail(
    email: string,
    firstName: string,
    lastName: string,
    orgId: string,
    reason?: string
  ): Promise<IEmailResponse> {
    const html = accountDeactivationTemplate({
      firstName,
      lastName,
      reason,
    });

    return this.sendEmail({
      to: email,
      subject: 'Account Deactivated - Nevada Inventory',
      body: html,
      template: 'account-deactivation',
      variables: { firstName, lastName },
      orgId,
    });
  }
}
