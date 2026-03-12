/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoginUseCase } from '@application/authUseCases/loginUseCase';
import { LogoutUseCase } from '@application/authUseCases/logoutUseCase';
import { RefreshTokenUseCase } from '@application/authUseCases/refreshTokenUseCase';
import { AuthController } from '@interface/http/routes/auth.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuthenticationError, RateLimitError, TokenError, err, ok } from '@shared/domain/result';

describe('AuthController', () => {
  let authController: AuthController;
  let mockLoginUseCase: jest.Mocked<LoginUseCase>;
  let mockLogoutUseCase: jest.Mocked<LogoutUseCase>;
  let mockRefreshTokenUseCase: jest.Mocked<RefreshTokenUseCase>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock use cases
    mockLoginUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<LoginUseCase>;

    mockLogoutUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<LogoutUseCase>;

    mockRefreshTokenUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokenUseCase>;

    // Create controller instance
    authController = new AuthController(
      mockLoginUseCase,
      mockLogoutUseCase,
      mockRefreshTokenUseCase
    );
  });

  describe('login', () => {
    it('Given: valid login credentials When: logging in Then: should return successful response', async () => {
      // Arrange
      const loginRequest = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: 'org-123',
      };

      const mockLoginData = {
        success: true as const,
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'John',
            lastName: 'Doe',
            roles: ['USER'],
            permissions: ['USERS:READ'],
          },
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          accessTokenExpiresAt: new Date(Date.now() + 900000),
          refreshTokenExpiresAt: new Date(Date.now() + 604800000),
          sessionId: 'session-123',
        },
        message: 'Login successful',
        timestamp: new Date().toISOString(),
      };

      mockLoginUseCase.execute.mockResolvedValue(ok(mockLoginData) as any);

      const mockReq = {
        orgId: 'org-123',
      } as any;

      // Act
      const result = await authController.login(
        loginRequest,
        '192.168.1.1',
        'Mozilla/5.0',
        'org-123',
        mockReq
      );

      // Assert
      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123!',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        orgId: 'org-123',
      });
      expect(result).toEqual(mockLoginData);
    });

    it('Given: invalid credentials When: logging in Then: should throw UnauthorizedException', async () => {
      // Arrange
      const loginRequest = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
        orgId: 'org-123',
      };

      mockLoginUseCase.execute.mockResolvedValue(err(new AuthenticationError('invalid_password')));

      const mockReq = {
        orgId: 'org-123',
      } as any;

      // Act & Assert
      await expect(
        authController.login(loginRequest, '192.168.1.1', 'Mozilla/5.0', 'org-123', mockReq)
      ).rejects.toThrow('Authentication failed');
    });

    it('Given: rate limit exceeded When: logging in Then: should throw rate limit error', async () => {
      // Arrange
      const loginRequest = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: 'org-123',
      };

      mockLoginUseCase.execute.mockResolvedValue(
        err(new RateLimitError('Too many login attempts. Please try again later.'))
      );

      const mockReq = {
        orgId: 'org-123',
      } as any;

      // Act & Assert
      await expect(
        authController.login(loginRequest, '192.168.1.1', 'Mozilla/5.0', 'org-123', mockReq)
      ).rejects.toThrow('Too many login attempts');
    });

    it('Given: internal error When: logging in Then: should throw authentication error', async () => {
      // Arrange
      const loginRequest = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: 'org-123',
      };

      mockLoginUseCase.execute.mockResolvedValue(err(new AuthenticationError('internal_error')));

      const mockReq = {
        orgId: 'org-123',
      } as any;

      // Act & Assert
      await expect(
        authController.login(loginRequest, '192.168.1.1', 'Mozilla/5.0', 'org-123', mockReq)
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('logout', () => {
    it('Given: valid user and token When: logging out Then: should return successful response', async () => {
      // Arrange
      const logoutRequest = {
        accessToken: 'token-123',
        userId: 'user-123',
        orgId: 'org-123',
      };

      const mockUser = {
        id: 'user-123',
        orgId: 'org-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['USER'],
        permissions: ['USERS:READ'],
      };

      const mockReq = {
        user: mockUser,
      } as any;

      const mockLogoutData = {
        success: true as const,
        message: 'Logout successful',
        data: {
          blacklistedTokens: 1,
        },
        timestamp: new Date().toISOString(),
      };

      mockLogoutUseCase.execute.mockResolvedValue(ok(mockLogoutData));

      // Act
      const result = await authController.logout(logoutRequest, mockReq, '192.168.1.1');

      // Assert
      expect(mockLogoutUseCase.execute).toHaveBeenCalledWith({
        accessToken: 'token-123',
        userId: 'user-123',
        orgId: 'org-123',
        ipAddress: '192.168.1.1',
      });
      expect(result).toEqual(mockLogoutData);
    });

    it('Given: token error When: logging out Then: should throw UnauthorizedException', async () => {
      // Arrange
      const logoutRequest = {
        accessToken: 'token-123',
        userId: 'user-123',
        orgId: 'org-123',
      };

      const mockUser = {
        id: 'user-123',
        orgId: 'org-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['USER'],
        permissions: ['USERS:READ'],
      };

      const mockReq = {
        user: mockUser,
      } as any;

      mockLogoutUseCase.execute.mockResolvedValue(err(new TokenError('token_user_mismatch')));

      // Act & Assert
      await expect(authController.logout(logoutRequest, mockReq, '192.168.1.1')).rejects.toThrow(
        'Invalid or expired token'
      );
    });
  });

  describe('refreshToken', () => {
    it('Given: valid refresh token When: refreshing token Then: should return new access token', async () => {
      // Arrange
      const refreshRequest = {
        refreshToken: 'refresh-token-456',
      };

      const mockRefreshData = {
        success: true as const,
        data: {
          accessToken: 'new-access-token-789',
          refreshToken: 'new-refresh-token-456',
          accessTokenExpiresAt: new Date(Date.now() + 900000),
          refreshTokenExpiresAt: new Date(Date.now() + 604800000),
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'John',
            lastName: 'Doe',
            roles: ['USER'],
            permissions: ['USERS:READ'],
          },
        },
        message: 'Token refreshed successfully',
        timestamp: new Date().toISOString(),
      };

      mockRefreshTokenUseCase.execute.mockResolvedValue(ok(mockRefreshData));

      // Act
      const result = await authController.refreshToken(
        refreshRequest,
        '192.168.1.1',
        'Mozilla/5.0'
      );

      // Assert
      expect(mockRefreshTokenUseCase.execute).toHaveBeenCalledWith({
        refreshToken: 'refresh-token-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(result).toEqual(mockRefreshData);
    });

    it('Given: invalid refresh token When: refreshing token Then: should throw UnauthorizedException', async () => {
      // Arrange
      const refreshRequest = {
        refreshToken: 'invalid-refresh-token',
      };

      mockRefreshTokenUseCase.execute.mockResolvedValue(err(new TokenError('invalid_token')));

      // Act & Assert
      await expect(
        authController.refreshToken(refreshRequest, '192.168.1.1', 'Mozilla/5.0')
      ).rejects.toThrow('Invalid or expired token');
    });

    it('Given: rate limit exceeded When: refreshing token Then: should throw rate limit error', async () => {
      // Arrange
      const refreshRequest = {
        refreshToken: 'refresh-token-456',
      };

      mockRefreshTokenUseCase.execute.mockResolvedValue(
        err(new RateLimitError('Too many refresh attempts. Please try again later.'))
      );

      // Act & Assert
      await expect(
        authController.refreshToken(refreshRequest, '192.168.1.1', 'Mozilla/5.0')
      ).rejects.toThrow('Too many refresh attempts');
    });
  });

  describe('login - additional branches', () => {
    it('Given: no req.orgId When: logging in Then: should use orgId from decorator', async () => {
      // Arrange
      const loginRequest = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: 'org-123',
      };
      const mockLoginData = {
        success: true as const,
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          sessionId: 'session-1',
        },
        message: 'Login successful',
        timestamp: new Date().toISOString(),
      };
      mockLoginUseCase.execute.mockResolvedValue(ok(mockLoginData) as any);

      const mockReq = {} as any; // no orgId on req

      // Act
      const result = await authController.login(
        loginRequest,
        '192.168.1.1',
        'Mozilla/5.0',
        'org-from-decorator',
        mockReq
      );

      // Assert
      expect(mockLoginUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-from-decorator',
        })
      );
      expect(result).toEqual(mockLoginData);
    });

    it('Given: req.orgId present When: logging in Then: should use req.orgId', async () => {
      // Arrange
      const loginRequest = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: 'org-body',
      };
      const mockLoginData = {
        success: true as const,
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          accessToken: 'at',
          refreshToken: 'rt',
          sessionId: 's1',
        },
        message: 'Login successful',
        timestamp: new Date().toISOString(),
      };
      mockLoginUseCase.execute.mockResolvedValue(ok(mockLoginData) as any);

      const mockReq = { orgId: 'org-middleware' } as any;

      // Act
      await authController.login(loginRequest, '10.0.0.1', 'TestAgent', 'org-decorator', mockReq);

      // Assert
      expect(mockLoginUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-middleware',
          ipAddress: '10.0.0.1',
          userAgent: 'TestAgent',
        })
      );
    });
  });

  describe('logout - additional branches', () => {
    it('Given: no user on request When: logging out Then: should throw UnauthorizedException', async () => {
      // Arrange
      const logoutRequest = { accessToken: 'token-123' } as any;
      const mockReq = { user: null } as any;

      // Act & Assert
      await expect(authController.logout(logoutRequest, mockReq, '192.168.1.1')).rejects.toThrow(
        'User not authenticated'
      );
    });

    it('Given: undefined user on request When: logging out Then: should throw UnauthorizedException', async () => {
      // Arrange
      const logoutRequest = { accessToken: 'token-123' } as any;
      const mockReq = {} as any;

      // Act & Assert
      await expect(authController.logout(logoutRequest, mockReq, '192.168.1.1')).rejects.toThrow(
        'User not authenticated'
      );
    });
  });

  describe('logoutAllSessions', () => {
    it('Given: authenticated user When: logging out all sessions Then: should return success', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        orgId: 'org-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['USER'],
        permissions: ['USERS:READ'],
      };
      const mockReq = {
        user: mockUser,
        headers: { authorization: 'Bearer some-token-123' },
      } as any;
      const mockLogoutData = {
        success: true as const,
        message: 'All sessions logged out',
        data: { blacklistedTokens: 5 },
        timestamp: new Date().toISOString(),
      };
      mockLogoutUseCase.execute.mockResolvedValue(ok(mockLogoutData));

      // Act
      const result = await authController.logoutAllSessions(mockReq, '192.168.1.1');

      // Assert
      expect(mockLogoutUseCase.execute).toHaveBeenCalledWith({
        accessToken: 'some-token-123',
        userId: 'user-123',
        orgId: 'org-123',
        ipAddress: '192.168.1.1',
        reason: 'SECURITY',
      });
      expect(result).toEqual(mockLogoutData);
    });

    it('Given: no user on request When: logging out all sessions Then: should throw UnauthorizedException', async () => {
      // Arrange
      const mockReq = { user: null, headers: {} } as any;

      // Act & Assert
      await expect(authController.logoutAllSessions(mockReq, '192.168.1.1')).rejects.toThrow(
        'User not authenticated'
      );
    });

    it('Given: no authorization header When: logging out all Then: should pass empty access token', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        orgId: 'org-123',
      };
      const mockReq = {
        user: mockUser,
        headers: {},
      } as any;
      const mockLogoutData = {
        success: true as const,
        message: 'All sessions logged out',
        data: { blacklistedTokens: 3 },
        timestamp: new Date().toISOString(),
      };
      mockLogoutUseCase.execute.mockResolvedValue(ok(mockLogoutData));

      // Act
      const result = await authController.logoutAllSessions(mockReq, '10.0.0.1');

      // Assert
      expect(mockLogoutUseCase.execute).toHaveBeenCalledWith({
        accessToken: '',
        userId: 'user-123',
        orgId: 'org-123',
        ipAddress: '10.0.0.1',
        reason: 'SECURITY',
      });
      expect(result).toEqual(mockLogoutData);
    });

    it('Given: error from use case When: logging out all sessions Then: should throw', async () => {
      // Arrange
      const mockUser = { id: 'user-123', orgId: 'org-123' };
      const mockReq = {
        user: mockUser,
        headers: { authorization: 'Bearer token-123' },
      } as any;
      mockLogoutUseCase.execute.mockResolvedValue(err(new TokenError('token_blacklisted')));

      // Act & Assert
      await expect(authController.logoutAllSessions(mockReq, '192.168.1.1')).rejects.toThrow();
    });
  });
});
