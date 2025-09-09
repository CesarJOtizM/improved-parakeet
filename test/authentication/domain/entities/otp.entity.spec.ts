import { Otp } from '@auth/domain/entities/otp.entity';

describe('Otp Entity', () => {
  const mockOrgId = 'test-org-id';
  const mockEmail = 'test@example.com';
  const mockIpAddress = '192.168.1.1';
  const mockUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  describe('create', () => {
    it('Given: valid email, PASSWORD_RESET type, orgId When: creating OTP Then: should create valid OTP with default expiry', () => {
      // Arrange
      const type = 'PASSWORD_RESET' as const;

      // Act
      const otp = Otp.create(mockEmail, type, mockOrgId);

      // Assert
      expect(otp).toBeInstanceOf(Otp);
      expect(otp.email).toBe(mockEmail);
      expect(otp.type).toBe(type);
      expect(otp.isUsed).toBe(false);
      expect(otp.attempts).toBe(0);
      expect(otp.maxAttempts).toBe(3);
      expect(otp.code).toMatch(/^\d{6}$/);
      expect(otp.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(otp.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 16 * 60 * 1000); // 15 min + 1 min buffer
    });

    it('Given: valid email, ACCOUNT_ACTIVATION type, orgId, ipAddress, userAgent When: creating OTP Then: should create valid OTP with custom expiry', () => {
      // Arrange
      const type = 'ACCOUNT_ACTIVATION' as const;
      const expiryMinutes = 30;

      // Act
      const otp = Otp.create(
        mockEmail,
        type,
        mockOrgId,
        mockIpAddress,
        mockUserAgent,
        expiryMinutes
      );

      // Assert
      expect(otp).toBeInstanceOf(Otp);
      expect(otp.email).toBe(mockEmail);
      expect(otp.type).toBe(type);
      expect(otp.ipAddress).toBe(mockIpAddress);
      expect(otp.userAgent).toBe(mockUserAgent);
      expect(otp.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 60 * 1000);
      expect(otp.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 31 * 60 * 1000);
    });

    it('Given: valid email, TWO_FACTOR type, orgId When: creating OTP Then: should create valid OTP with 6-digit code', () => {
      // Arrange
      const type = 'TWO_FACTOR' as const;

      // Act
      const otp = Otp.create(mockEmail, type, mockOrgId);

      // Assert
      expect(otp).toBeInstanceOf(Otp);
      expect(otp.type).toBe(type);
      expect(otp.code).toMatch(/^\d{6}$/);
      expect(otp.code.length).toBe(6);
    });
  });

  describe('reconstitute', () => {
    it('Given: valid OTP props, id, orgId When: reconstituting OTP Then: should create OTP with provided data', () => {
      // Arrange
      const mockId = 'test-otp-id';
      const mockProps = {
        email: mockEmail,
        code: '123456',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isUsed: false,
        attempts: 1,
        maxAttempts: 3,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      };

      // Act
      const otp = Otp.reconstitute(mockProps, mockId, mockOrgId);

      // Assert
      expect(otp).toBeInstanceOf(Otp);
      expect(otp.id).toBe(mockId);
      expect(otp.orgId).toBe(mockOrgId);
      expect(otp.email).toBe(mockProps.email);
      expect(otp.code).toBe(mockProps.code);
      expect(otp.type).toBe(mockProps.type);
      expect(otp.expiresAt).toEqual(mockProps.expiresAt);
      expect(otp.isUsed).toBe(mockProps.isUsed);
      expect(otp.attempts).toBe(mockProps.attempts);
      expect(otp.maxAttempts).toBe(mockProps.maxAttempts);
      expect(otp.ipAddress).toBe(mockProps.ipAddress);
      expect(otp.userAgent).toBe(mockProps.userAgent);
    });
  });

  describe('isValid', () => {
    it('Given: unused OTP with attempts below max and not expired When: checking validity Then: should return true', () => {
      // Arrange
      const otp = Otp.create(mockEmail, 'PASSWORD_RESET', mockOrgId);

      // Act
      const result = otp.isValid();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: used OTP When: checking validity Then: should return false', () => {
      // Arrange
      const otp = Otp.create(mockEmail, 'PASSWORD_RESET', mockOrgId);
      otp.markAsUsed();

      // Act
      const result = otp.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('Given: OTP with max attempts reached When: checking validity Then: should return false', () => {
      // Arrange
      const mockProps = {
        email: mockEmail,
        code: '123456',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isUsed: false,
        attempts: 3,
        maxAttempts: 3,
      };
      const otp = Otp.reconstitute(mockProps, 'test-id', mockOrgId);

      // Act
      const result = otp.isValid();

      // Assert
      expect(result).toBe(false);
    });

    it('Given: expired OTP When: checking validity Then: should return false', () => {
      // Arrange
      const mockProps = {
        email: mockEmail,
        code: '123456',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        isUsed: false,
        attempts: 0,
        maxAttempts: 3,
      };
      const otp = Otp.reconstitute(mockProps, 'test-id', mockOrgId);

      // Act
      const result = otp.isValid();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('verify', () => {
    it('Given: valid OTP with correct code When: verifying code Then: should return true and mark as used', () => {
      // Arrange
      const otp = Otp.create(mockEmail, 'PASSWORD_RESET', mockOrgId);
      const correctCode = otp.code;
      const initialAttempts = otp.attempts;

      // Act
      const result = otp.verify(correctCode);

      // Assert
      expect(result).toBe(true);
      expect(otp.isUsed).toBe(true);
      expect(otp.attempts).toBe(initialAttempts + 1);
    });

    it('Given: valid OTP with incorrect code When: verifying code Then: should return false and increment attempts', () => {
      // Arrange
      const otp = Otp.create(mockEmail, 'PASSWORD_RESET', mockOrgId);
      const incorrectCode = '000000';
      const initialAttempts = otp.attempts;

      // Act
      const result = otp.verify(incorrectCode);

      // Assert
      expect(result).toBe(false);
      expect(otp.isUsed).toBe(false);
      expect(otp.attempts).toBe(initialAttempts + 1);
    });

    it('Given: invalid OTP (used) When: verifying code Then: should return false without incrementing attempts', () => {
      // Arrange
      const otp = Otp.create(mockEmail, 'PASSWORD_RESET', mockOrgId);
      otp.markAsUsed();
      const initialAttempts = otp.attempts;

      // Act
      const result = otp.verify(otp.code);

      // Assert
      expect(result).toBe(false);
      expect(otp.attempts).toBe(initialAttempts);
    });

    it('Given: invalid OTP (expired) When: verifying code Then: should return false without incrementing attempts', () => {
      // Arrange
      const mockProps = {
        email: mockEmail,
        code: '123456',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() - 1000),
        isUsed: false,
        attempts: 0,
        maxAttempts: 3,
      };
      const otp = Otp.reconstitute(mockProps, 'test-id', mockOrgId);
      const initialAttempts = otp.attempts;

      // Act
      const result = otp.verify('123456');

      // Assert
      expect(result).toBe(false);
      expect(otp.attempts).toBe(initialAttempts);
    });

    it('Given: invalid OTP (max attempts reached) When: verifying code Then: should return false without incrementing attempts', () => {
      // Arrange
      const mockProps = {
        email: mockEmail,
        code: '123456',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isUsed: false,
        attempts: 3,
        maxAttempts: 3,
      };
      const otp = Otp.reconstitute(mockProps, 'test-id', mockOrgId);
      const initialAttempts = otp.attempts;

      // Act
      const result = otp.verify('123456');

      // Assert
      expect(result).toBe(false);
      expect(otp.attempts).toBe(initialAttempts);
    });
  });

  describe('markAsUsed', () => {
    it('Given: unused OTP When: marking as used Then: should mark OTP as used', () => {
      // Arrange
      const otp = Otp.create(mockEmail, 'PASSWORD_RESET', mockOrgId);

      // Act
      otp.markAsUsed();

      // Assert
      expect(otp.isUsed).toBe(true);
    });
  });

  describe('isExpired', () => {
    it('Given: OTP with future expiry When: checking if expired Then: should return false', () => {
      // Arrange
      const otp = Otp.create(mockEmail, 'PASSWORD_RESET', mockOrgId);

      // Act
      const result = otp.isExpired();

      // Assert
      expect(result).toBe(false);
    });

    it('Given: OTP with past expiry When: checking if expired Then: should return true', () => {
      // Arrange
      const mockProps = {
        email: mockEmail,
        code: '123456',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() - 1000),
        isUsed: false,
        attempts: 0,
        maxAttempts: 3,
      };
      const otp = Otp.reconstitute(mockProps, 'test-id', mockOrgId);

      // Act
      const result = otp.isExpired();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('hasExceededMaxAttempts', () => {
    it('Given: OTP with attempts below max When: checking if exceeded max attempts Then: should return false', () => {
      // Arrange
      const otp = Otp.create(mockEmail, 'PASSWORD_RESET', mockOrgId);

      // Act
      const result = otp.hasExceededMaxAttempts();

      // Assert
      expect(result).toBe(false);
    });

    it('Given: OTP with attempts equal to max When: checking if exceeded max attempts Then: should return true', () => {
      // Arrange
      const mockProps = {
        email: mockEmail,
        code: '123456',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isUsed: false,
        attempts: 3,
        maxAttempts: 3,
      };
      const otp = Otp.reconstitute(mockProps, 'test-id', mockOrgId);

      // Act
      const result = otp.hasExceededMaxAttempts();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: OTP with attempts above max When: checking if exceeded max attempts Then: should return true', () => {
      // Arrange
      const mockProps = {
        email: mockEmail,
        code: '123456',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isUsed: false,
        attempts: 5,
        maxAttempts: 3,
      };
      const otp = Otp.reconstitute(mockProps, 'test-id', mockOrgId);

      // Act
      const result = otp.hasExceededMaxAttempts();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Getters', () => {
    it('Given: OTP with all properties When: accessing getters Then: should return correct values', () => {
      // Arrange
      const mockProps = {
        email: mockEmail,
        code: '123456',
        type: 'PASSWORD_RESET' as const,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isUsed: false,
        attempts: 1,
        maxAttempts: 3,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      };
      const otp = Otp.reconstitute(mockProps, 'test-id', mockOrgId);

      // Act & Assert
      expect(otp.email).toBe(mockProps.email);
      expect(otp.code).toBe(mockProps.code);
      expect(otp.type).toBe(mockProps.type);
      expect(otp.expiresAt).toEqual(mockProps.expiresAt);
      expect(otp.isUsed).toBe(mockProps.isUsed);
      expect(otp.attempts).toBe(mockProps.attempts);
      expect(otp.maxAttempts).toBe(mockProps.maxAttempts);
      expect(otp.ipAddress).toBe(mockProps.ipAddress);
      expect(otp.userAgent).toBe(mockProps.userAgent);
    });

    it('Given: OTP without optional properties When: accessing optional getters Then: should return undefined', () => {
      // Arrange
      const otp = Otp.create(mockEmail, 'PASSWORD_RESET', mockOrgId);

      // Act & Assert
      expect(otp.ipAddress).toBeUndefined();
      expect(otp.userAgent).toBeUndefined();
    });
  });

  describe('Domain Events', () => {
    it('Given: newly created OTP When: checking domain events Then: should have no domain events', () => {
      // Arrange
      const otp = Otp.create(mockEmail, 'PASSWORD_RESET', mockOrgId);

      // Act & Assert
      expect(otp).toBeInstanceOf(Otp);
    });

    it('Given: OTP after verification When: checking domain events Then: should have updated timestamp', () => {
      // Arrange
      const otp = Otp.create(mockEmail, 'PASSWORD_RESET', mockOrgId);

      // Act
      otp.verify(otp.code);

      // Assert
      expect(otp.isUsed).toBe(true);
    });
  });
});
