import { EmailService } from '@infrastructure/externalServices/emailService';
import { describe, expect, it, jest } from '@jest/globals';

import type { IEmailRequest } from '@shared/ports/externalServices';

describe('EmailService', () => {
  const baseRequest: IEmailRequest = {
    to: 'user@example.com',
    subject: 'Test Email',
    body: 'Hello',
    template: 'test',
    variables: { name: 'User' },
    orgId: 'org-1',
  };

  it('sends email successfully', async () => {
    const service = new EmailService();

    // Let the real setTimeout run — the internal delay is only 100ms
    // and the ResilientCall timeout is 10s, so no timeout will fire
    const result = await service.sendEmail(baseRequest);

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('builds welcome email request', async () => {
    const service = new EmailService();
    const sendSpy = jest
      .spyOn(service, 'sendEmail')
      .mockResolvedValue({ success: true, messageId: 'm-1' });

    const result = await service.sendWelcomeEmail('user@example.com', 'Test', 'User', 'org-1');

    expect(result.success).toBe(true);
    expect(sendSpy).toHaveBeenCalled();

    sendSpy.mockRestore();
  });

  it('builds admin notification email request', async () => {
    const service = new EmailService();
    const sendSpy = jest
      .spyOn(service, 'sendEmail')
      .mockResolvedValue({ success: true, messageId: 'm-2' });

    const result = await service.sendNewUserNotificationToAdmin(
      'admin@example.com',
      'user@example.com',
      'Test',
      'User',
      'org-1'
    );

    expect(result.success).toBe(true);
    expect(sendSpy).toHaveBeenCalled();

    sendSpy.mockRestore();
  });

  it('builds activation email request', async () => {
    const service = new EmailService();
    const sendSpy = jest
      .spyOn(service, 'sendEmail')
      .mockResolvedValue({ success: true, messageId: 'm-3' });

    const result = await service.sendAccountActivationEmail(
      'user@example.com',
      'Test',
      'User',
      'org-1'
    );

    expect(result.success).toBe(true);
    expect(sendSpy).toHaveBeenCalled();

    sendSpy.mockRestore();
  });

  it('builds password reset otp email request', async () => {
    const service = new EmailService();
    const sendSpy = jest
      .spyOn(service, 'sendEmail')
      .mockResolvedValue({ success: true, messageId: 'm-4' });

    const result = await service.sendPasswordResetOtpEmail(
      'user@example.com',
      'Test',
      'User',
      '123456',
      'org-1',
      10
    );

    expect(result.success).toBe(true);
    expect(sendSpy).toHaveBeenCalled();

    sendSpy.mockRestore();
  });
});
