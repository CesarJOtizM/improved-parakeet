import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@infrastructure/externalServices/emailService';

// Mock Resend SDK
const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  beforeEach(async () => {
    mockSend.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              const map: Record<string, string> = {
                RESEND_API_KEY: 're_test_123',
                RESEND_FROM_EMAIL: 'Test <test@example.com>',
              };
              return map[key] ?? defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('sendEmail', () => {
    it('should send email successfully via Resend', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_123' }, error: null });

      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: '<p>Test</p>',
        template: 'test',
        orgId: 'org-1',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Test <test@example.com>',
          to: ['user@example.com'],
          subject: 'Test',
          html: '<p>Test</p>',
        })
      );
    });

    it('should handle Resend API error', async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });

      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: '<p>Test</p>',
        orgId: 'org-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should include idempotency key and tags', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_456' }, error: null });

      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: '<p>Test</p>',
        template: 'welcome',
        orgId: 'org-2',
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.headers['X-Idempotency-Key']).toMatch(/^welcome\/org-2\//);
      expect(callArgs.tags).toEqual(
        expect.arrayContaining([
          { name: 'template', value: 'welcome' },
          { name: 'org_id', value: 'org-2' },
        ])
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should generate HTML with user variables', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_w' }, error: null });

      const result = await service.sendWelcomeEmail('john@test.com', 'John', 'Doe', 'org-1');

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('John');
      expect(callArgs.html).toContain('Doe');
      expect(callArgs.html).toContain('Nevada Inventory');
    });
  });

  describe('sendPasswordResetOtpEmail', () => {
    it('should include OTP code in HTML', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_otp' }, error: null });

      const result = await service.sendPasswordResetOtpEmail(
        'user@test.com',
        'Jane',
        'Smith',
        '123456',
        'org-1',
        15
      );

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('123456');
      expect(callArgs.html).toContain('15 minutes');
    });
  });

  describe('sendAccountActivationEmail', () => {
    it('should generate activation HTML', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_act' }, error: null });

      const result = await service.sendAccountActivationEmail(
        'user@test.com',
        'Jane',
        'Smith',
        'org-1'
      );

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Account Activated');
      expect(callArgs.html).toContain('Jane');
    });
  });

  describe('sendNewUserNotificationToAdmin', () => {
    it('should include new user details in HTML', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_admin' }, error: null });

      const result = await service.sendNewUserNotificationToAdmin(
        'admin@test.com',
        'newuser@test.com',
        'New',
        'User',
        'org-1'
      );

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('New User');
      expect(callArgs.html).toContain('newuser@test.com');
    });
  });

  describe('sendEmail - array of recipients', () => {
    it('should send to array of recipients', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_arr' }, error: null });

      const result = await service.sendEmail({
        to: ['a@test.com', 'b@test.com'],
        subject: 'Bulk',
        body: '<p>Bulk</p>',
        orgId: 'org-1',
      });

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toEqual(['a@test.com', 'b@test.com']);
    });
  });

  describe('sendEmail - no template defaults to generic', () => {
    it('should use generic as default template in idempotency key and tags', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_gen' }, error: null });

      await service.sendEmail({
        to: 'user@test.com',
        subject: 'No template',
        body: '<p>Test</p>',
        orgId: 'org-1',
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.headers['X-Idempotency-Key']).toMatch(/^generic\/org-1\//);
      expect(callArgs.tags).toEqual(
        expect.arrayContaining([{ name: 'template', value: 'generic' }])
      );
    });
  });

  describe('sendEmail - resilient call exception', () => {
    it('should catch thrown exceptions and return error response', async () => {
      mockSend.mockRejectedValue(new Error('Network timeout'));

      const result = await service.sendEmail({
        to: 'user@test.com',
        subject: 'Fail',
        body: '<p>Fail</p>',
        orgId: 'org-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle non-Error exception and return Unknown error', async () => {
      mockSend.mockRejectedValue('raw string error');

      const result = await service.sendEmail({
        to: 'user@test.com',
        subject: 'Fail',
        body: '<p>Fail</p>',
        orgId: 'org-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('sendWelcomeWithCredentialsEmail', () => {
    it('should generate HTML with credentials', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_cred' }, error: null });

      const result = await service.sendWelcomeWithCredentialsEmail(
        'user@test.com',
        'John',
        'Doe',
        'TempPass123!',
        'org-1'
      );

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('John');
      expect(callArgs.html).toContain('TempPass123!');
    });
  });

  describe('sendAccountDeactivationEmail', () => {
    it('should generate deactivation HTML', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_deact' }, error: null });

      const result = await service.sendAccountDeactivationEmail(
        'user@test.com',
        'Jane',
        'Smith',
        'org-1',
        'Policy violation'
      );

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Jane');
    });

    it('should work without reason', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_deact2' }, error: null });

      const result = await service.sendAccountDeactivationEmail(
        'user@test.com',
        'Bob',
        'Jones',
        'org-1'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('EmailService - no API key', () => {
    let serviceNoKey: EmailService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultVal?: string) => {
                if (key === 'RESEND_API_KEY') return undefined;
                if (key === 'RESEND_FROM_EMAIL') return defaultVal;
                return defaultVal;
              }),
            },
          },
        ],
      }).compile();

      serviceNoKey = module.get<EmailService>(EmailService);
    });

    it('should return mock success when no API key is configured', async () => {
      const result = await serviceNoKey.sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        body: '<p>Test</p>',
        orgId: 'org-1',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock_/);
    });
  });

  describe('sendPasswordResetOtpEmail - default expiry', () => {
    it('should use default 15 minute expiry', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg_otp2' }, error: null });

      const result = await service.sendPasswordResetOtpEmail(
        'user@test.com',
        'Jane',
        'Smith',
        '654321',
        'org-1'
      );

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('654321');
      expect(callArgs.html).toContain('15 minutes');
    });
  });
});
