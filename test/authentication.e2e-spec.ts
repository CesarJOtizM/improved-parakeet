import { AuthenticationModule } from '@auth/authentication.module';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { PrismaService } from '@infrastructure/database/prisma.service';
// import { EmailService } from '@infrastructure/externalServices/email.service';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

describe('Authentication E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  // let userRepository: UserRepository;
  // let sessionRepository: SessionRepository;
  // let otpRepository: OtpRepository;
  // let emailService: EmailService;

  const testOrgId = 'test-org-123';
  const testUserEmail = 'test@example.com';
  const testUserPassword = 'ValidPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthenticationModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    // userRepository = moduleFixture.get<UserRepository>('UserRepository');
    // sessionRepository = moduleFixture.get<SessionRepository>('SessionRepository');
    // otpRepository = moduleFixture.get<OtpRepository>('OtpRepository');
    // emailService = moduleFixture.get<EmailService>(EmailService);

    // Clean up test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  describe('POST /auth/login', () => {
    it('Given: valid credentials When: logging in Then: should return access and refresh tokens', async () => {
      // Arrange
      await createTestUser();

      const loginData = {
        email: testUserEmail,
        password: testUserPassword,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUserEmail);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
      expect(response.body.data.tokens.expiresIn).toBeDefined();
      expect(response.body.message).toBe('Login successful');
    });

    it('Given: invalid email When: logging in Then: should return unauthorized error', async () => {
      // Arrange
      const loginData = {
        email: 'nonexistent@example.com',
        password: testUserPassword,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
      expect(response.body.errors).toContain('Email or password is incorrect');
    });

    it('Given: invalid password When: logging in Then: should return unauthorized error', async () => {
      // Arrange
      await createTestUser();

      const loginData = {
        email: testUserEmail,
        password: 'WrongPassword123!',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
      expect(response.body.errors).toContain('Email or password is incorrect');
    });

    it('Given: inactive user When: logging in Then: should return account inactive error', async () => {
      // Arrange
      await createTestUser('INACTIVE');

      const loginData = {
        email: testUserEmail,
        password: testUserPassword,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Account is not active');
      expect(response.body.errors).toContain(
        'Your account is not active. Please contact administrator.'
      );
    });

    it('Given: locked user When: logging in Then: should return account locked error', async () => {
      // Arrange
      await createTestUser('LOCKED');

      const loginData = {
        email: testUserEmail,
        password: testUserPassword,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Account is locked');
      expect(response.body.errors).toContain(
        'Your account is locked. Please try again later or contact administrator.'
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('Given: valid access token When: logging out Then: should return successful logout', async () => {
      // Arrange
      await createTestUser();
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: testUserEmail,
        password: testUserPassword,
      });

      const accessToken = loginResponse.body.data.tokens.accessToken;

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('Given: invalid access token When: logging out Then: should return unauthorized error', async () => {
      // Arrange
      const invalidToken = 'invalid-token-123';

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('Given: no access token When: logging out Then: should return unauthorized error', async () => {
      // Act
      const response = await request(app.getHttpServer()).post('/auth/logout').expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('POST /auth/refresh', () => {
    it('Given: valid refresh token When: refreshing token Then: should return new access token', async () => {
      // Arrange
      await createTestUser();
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: testUserEmail,
        password: testUserPassword,
      });

      const refreshToken = loginResponse.body.data.tokens.refreshToken;

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBe(refreshToken);
      expect(response.body.data.expiresIn).toBeDefined();
      expect(response.body.message).toBe('Token refreshed successfully');
    });

    it('Given: invalid refresh token When: refreshing token Then: should return unauthorized error', async () => {
      // Arrange
      const invalidRefreshToken = 'invalid-refresh-token-123';

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: invalidRefreshToken })
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
      expect(response.body.errors).toContain('Refresh token is invalid or expired');
    });

    it('Given: expired refresh token When: refreshing token Then: should return unauthorized error', async () => {
      // Arrange
      const expiredRefreshToken = 'expired-refresh-token-123';

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: expiredRefreshToken })
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });
  });

  describe('GET /auth/profile', () => {
    it('Given: valid access token When: getting profile Then: should return user profile', async () => {
      // Arrange
      await createTestUser();
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: testUserEmail,
        password: testUserPassword,
      });

      const accessToken = loginResponse.body.data.tokens.accessToken;

      // Act
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUserEmail);
      expect(response.body.data.username).toBe('testuser');
      expect(response.body.data.orgId).toBe(testOrgId);
      expect(response.body.data.roles).toBeDefined();
      expect(response.body.data.permissions).toBeDefined();
      expect(response.body.message).toBe('Profile retrieved successfully');
    });

    it('Given: invalid access token When: getting profile Then: should return unauthorized error', async () => {
      // Arrange
      const invalidToken = 'invalid-token-123';

      // Act
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('Given: no access token When: getting profile Then: should return unauthorized error', async () => {
      // Act
      const response = await request(app.getHttpServer()).get('/auth/profile').expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('POST /auth/register', () => {
    it('Given: valid registration data When: registering user Then: should return successful registration', async () => {
      // Arrange
      const registrationData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'ValidPass123!',
        firstName: 'New',
        lastName: 'User',
        organizationSlug: 'test-org',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registrationData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('newuser@example.com');
      expect(response.body.data.username).toBe('newuser');
      expect(response.body.data.firstName).toBe('New');
      expect(response.body.data.lastName).toBe('User');
      expect(response.body.data.status).toBe('INACTIVE');
      expect(response.body.message).toBe(
        'User registered successfully. Your account requires activation by the administrator.'
      );
      expect(response.body.requiresAdminActivation).toBe(true);
    });

    it('Given: duplicate email When: registering user Then: should return validation error', async () => {
      // Arrange
      await createTestUser();

      const registrationData = {
        email: testUserEmail,
        username: 'differentuser',
        password: 'ValidPass123!',
        firstName: 'Different',
        lastName: 'User',
        organizationSlug: 'test-org',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registrationData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('Email already exists');
    });

    it('Given: duplicate username When: registering user Then: should return validation error', async () => {
      // Arrange
      await createTestUser();

      const registrationData = {
        email: 'different@example.com',
        username: 'testuser',
        password: 'ValidPass123!',
        firstName: 'Different',
        lastName: 'User',
        organizationSlug: 'test-org',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registrationData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('Username already exists');
    });

    it('Given: weak password When: registering user Then: should return validation error', async () => {
      // Arrange
      const registrationData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'weak',
        firstName: 'New',
        lastName: 'User',
        organizationSlug: 'test-org',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registrationData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('Password must be at least 8 characters long');
    });
  });

  describe('POST /auth/password-reset/request', () => {
    it('Given: valid email When: requesting password reset Then: should return success', async () => {
      // Arrange
      await createTestUser();

      const requestData = {
        email: testUserEmail,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/password-reset/request')
        .send(requestData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset email sent successfully');
    });

    it('Given: non-existent email When: requesting password reset Then: should return success (security)', async () => {
      // Arrange
      const requestData = {
        email: 'nonexistent@example.com',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/password-reset/request')
        .send(requestData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset email sent successfully');
    });
  });

  describe('POST /auth/password-reset/reset', () => {
    it('Given: valid OTP and new password When: resetting password Then: should return success', async () => {
      // Arrange
      await createTestUser();
      const otp = await createTestOtp(testUserEmail);

      const resetData = {
        email: testUserEmail,
        otpCode: otp.code,
        newPassword: 'NewValidPass123!',
        confirmPassword: 'NewValidPass123!',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/password-reset/reset')
        .send(resetData)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset successfully');
    });

    it('Given: invalid OTP When: resetting password Then: should return error', async () => {
      // Arrange
      await createTestUser();

      const resetData = {
        email: testUserEmail,
        otpCode: '000000',
        newPassword: 'NewValidPass123!',
        confirmPassword: 'NewValidPass123!',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/password-reset/reset')
        .send(resetData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid OTP');
      expect(response.body.errors).toContain('Invalid or expired OTP code');
    });

    it('Given: mismatched passwords When: resetting password Then: should return validation error', async () => {
      // Arrange
      await createTestUser();
      const otp = await createTestOtp(testUserEmail);

      const resetData = {
        email: testUserEmail,
        otpCode: otp.code,
        newPassword: 'NewValidPass123!',
        confirmPassword: 'DifferentPass123!',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/password-reset/reset')
        .send(resetData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('Passwords do not match');
    });
  });

  describe('GET /auth/health', () => {
    it('Given: authentication service When: checking health Then: should return healthy status', async () => {
      // Act
      const response = await request(app.getHttpServer()).get('/auth/health').expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.service).toBe('authentication');
      expect(response.body.message).toBe('Authentication service is healthy');
    });
  });

  // Helper functions
  async function createTestUser(_status: string = 'ACTIVE') {
    const hashedPassword = await AuthenticationService.hashPassword(testUserPassword);

    return await prismaService.user.create({
      data: {
        email: testUserEmail,
        username: 'testuser',
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        orgId: testOrgId,
      },
    });
  }

  async function createTestOtp(email: string) {
    return await prismaService.otp.create({
      data: {
        email,
        code: '123456',
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        isUsed: false,
        attempts: 0,
        maxAttempts: 3,
        orgId: testOrgId,
      },
    });
  }

  async function cleanupTestData() {
    await prismaService.otp.deleteMany({
      where: { orgId: testOrgId },
    });
    await prismaService.session.deleteMany({
      where: { orgId: testOrgId },
    });
    await prismaService.user.deleteMany({
      where: { orgId: testOrgId },
    });
  }
});
