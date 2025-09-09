/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoginUseCase } from '@application/authUseCases/loginUseCase';
import { LogoutUseCase } from '@application/authUseCases/logoutUseCase';
import { RefreshTokenUseCase } from '@application/authUseCases/refreshTokenUseCase';
import { AuthController } from '@interface/http/routes/auth.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

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

      const mockLoginResult = {
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

      mockLoginUseCase.execute.mockResolvedValue(mockLoginResult);

      // Act
      const result = await authController.login(
        loginRequest,
        '192.168.1.1',
        'Mozilla/5.0',
        'org-123'
      );

      // Assert
      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123!',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        orgId: 'org-123',
      });
      expect(result).toEqual(mockLoginResult);
    });

    it('Given: invalid credentials When: logging in Then: should return error response', async () => {
      // Arrange
      const loginRequest = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
        orgId: 'org-123',
      };

      mockLoginUseCase.execute.mockRejectedValue(new Error('Invalid credentials'));

      // Act & Assert
      await expect(
        authController.login(loginRequest, '192.168.1.1', 'Mozilla/5.0', 'org-123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('Given: rate limit exceeded When: logging in Then: should return rate limit error', async () => {
      // Arrange
      const loginRequest = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: 'org-123',
      };

      mockLoginUseCase.execute.mockRejectedValue(new Error('Too many login attempts'));

      // Act & Assert
      await expect(
        authController.login(loginRequest, '192.168.1.1', 'Mozilla/5.0', 'org-123')
      ).rejects.toThrow('Too many login attempts');
    });

    it('Given: login use case error When: logging in Then: should return server error', async () => {
      // Arrange
      const loginRequest = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        orgId: 'org-123',
      };

      mockLoginUseCase.execute.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(
        authController.login(loginRequest, '192.168.1.1', 'Mozilla/5.0', 'org-123')
      ).rejects.toThrow('Database connection failed');
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

      const mockLogoutResult = {
        success: true as const,
        message: 'Logout successful',
        data: {
          blacklistedTokens: 1,
        },
        timestamp: new Date().toISOString(),
      };

      mockLogoutUseCase.execute.mockResolvedValue(mockLogoutResult);

      // Act
      const result = await authController.logout(logoutRequest, mockReq, '192.168.1.1');

      // Assert
      expect(mockLogoutUseCase.execute).toHaveBeenCalledWith({
        accessToken: 'token-123',
        userId: 'user-123',
        orgId: 'org-123',
        ipAddress: '192.168.1.1',
      });
      expect(result).toEqual(mockLogoutResult);
    });

    it('Given: logout use case error When: logging out Then: should return server error', async () => {
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

      mockLogoutUseCase.execute.mockRejectedValue(new Error('Token blacklist failed'));

      // Act & Assert
      await expect(authController.logout(logoutRequest, mockReq, '192.168.1.1')).rejects.toThrow(
        'Token blacklist failed'
      );
    });
  });

  describe('refreshToken', () => {
    it('Given: valid refresh token When: refreshing token Then: should return new access token', async () => {
      // Arrange
      const refreshRequest = {
        refreshToken: 'refresh-token-456',
      };

      const mockRefreshResult = {
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

      mockRefreshTokenUseCase.execute.mockResolvedValue(mockRefreshResult);

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
      expect(result).toEqual(mockRefreshResult);
    });

    it('Given: invalid refresh token When: refreshing token Then: should return error response', async () => {
      // Arrange
      const refreshRequest = {
        refreshToken: 'invalid-refresh-token',
      };

      mockRefreshTokenUseCase.execute.mockRejectedValue(new Error('Invalid refresh token'));

      // Act & Assert
      await expect(
        authController.refreshToken(refreshRequest, '192.168.1.1', 'Mozilla/5.0')
      ).rejects.toThrow('Invalid refresh token');
    });

    it('Given: refresh token use case error When: refreshing token Then: should return server error', async () => {
      // Arrange
      const refreshRequest = {
        refreshToken: 'refresh-token-456',
      };

      mockRefreshTokenUseCase.execute.mockRejectedValue(new Error('JWT verification failed'));

      // Act & Assert
      await expect(
        authController.refreshToken(refreshRequest, '192.168.1.1', 'Mozilla/5.0')
      ).rejects.toThrow('JWT verification failed');
    });
  });
});
