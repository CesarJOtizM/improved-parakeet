import { Session } from '@auth/domain/entities/session.entity';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { SessionRepository } from '@infrastructure/database/repositories/session.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrismaService: { session: Record<string, jest.Mock<any>> };

  const mockSessionData = {
    id: 'session-123',
    userId: 'user-123',
    token: 'jwt-token-123',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    isActive: true,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { orgId: 'org-123' },
  };

  beforeEach(() => {
    mockPrismaService = {
      session: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    };

    repository = new SessionRepository(mockPrismaService as unknown as PrismaService);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return session', async () => {
      // Arrange
      mockPrismaService.session.findFirst.mockResolvedValue(mockSessionData);

      // Act
      const result = await repository.findById('session-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('session-123');
      expect(result?.userId).toBe('user-123');
      expect(mockPrismaService.session.findFirst).toHaveBeenCalledWith({
        where: { id: 'session-123', user: { orgId: 'org-123' } },
      });
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.session.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by id Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.findFirst.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(repository.findById('session-123', 'org-123')).rejects.toThrow('Database error');
    });
  });

  describe('findByUserId', () => {
    it('Given: valid userId When: finding by userId Then: should return sessions', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockResolvedValue([mockSessionData]);

      // Act
      const result = await repository.findByUserId('user-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
    });

    it('Given: no sessions When: finding by userId Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByUserId('user-999', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding by userId Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockRejectedValue(new Error('Query failed'));

      // Act & Assert
      await expect(repository.findByUserId('user-123', 'org-123')).rejects.toThrow('Query failed');
    });
  });

  describe('findActiveSessions', () => {
    it('Given: active sessions exist When: finding active sessions Then: should return them', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockResolvedValue([mockSessionData]);

      // Act
      const result = await repository.findActiveSessions('user-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
      expect(mockPrismaService.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isActive: true,
          expiresAt: { gt: expect.any(Date) },
          user: { orgId: 'org-123' },
        },
      });
    });

    it('Given: no active sessions When: finding active sessions Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findActiveSessions('user-123', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding active sessions Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockRejectedValue(new Error('Connection lost'));

      // Act & Assert
      await expect(repository.findActiveSessions('user-123', 'org-123')).rejects.toThrow(
        'Connection lost'
      );
    });
  });

  describe('findActiveByUserId', () => {
    it('Given: active sessions exist When: finding active by userId Then: should return them', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockResolvedValue([mockSessionData]);

      // Act
      const result = await repository.findActiveByUserId('user-123', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('findActiveByUserIdAndToken', () => {
    it('Given: active session with token exists When: finding Then: should return session', async () => {
      // Arrange
      mockPrismaService.session.findFirst.mockResolvedValue(mockSessionData);

      // Act
      const result = await repository.findActiveByUserIdAndToken(
        'user-123',
        'org-123',
        'jwt-token-123'
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.token).toBe('jwt-token-123');
    });

    it('Given: no matching session When: finding Then: should return null', async () => {
      // Arrange
      mockPrismaService.session.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findActiveByUserIdAndToken(
        'user-123',
        'org-123',
        'invalid-token'
      );

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.findFirst.mockRejectedValue(new Error('Token lookup failed'));

      // Act & Assert
      await expect(
        repository.findActiveByUserIdAndToken('user-123', 'org-123', 'token')
      ).rejects.toThrow('Token lookup failed');
    });
  });

  describe('findByToken', () => {
    it('Given: valid token When: finding by token Then: should return session', async () => {
      // Arrange
      mockPrismaService.session.findFirst.mockResolvedValue(mockSessionData);

      // Act
      const result = await repository.findByToken('jwt-token-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.token).toBe('jwt-token-123');
    });

    it('Given: invalid token When: finding by token Then: should return null', async () => {
      // Arrange
      mockPrismaService.session.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByToken('invalid-token');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by token Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.findFirst.mockRejectedValue(new Error('Token search failed'));

      // Act & Assert
      await expect(repository.findByToken('token')).rejects.toThrow('Token search failed');
    });
  });

  describe('findExpiredSessions', () => {
    it('Given: expired sessions exist When: finding expired Then: should return them', async () => {
      // Arrange
      const expiredSession = {
        ...mockSessionData,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };
      mockPrismaService.session.findMany.mockResolvedValue([expiredSession]);

      // Act
      const result = await repository.findExpiredSessions();

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding expired Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockRejectedValue(new Error('Query timeout'));

      // Act & Assert
      await expect(repository.findExpiredSessions()).rejects.toThrow('Query timeout');
    });
  });

  describe('findSessionsByIpAddress', () => {
    it('Given: sessions with IP exist When: finding by IP Then: should return them', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockResolvedValue([mockSessionData]);

      // Act
      const result = await repository.findSessionsByIpAddress('192.168.1.1', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].ipAddress).toBe('192.168.1.1');
    });

    it('Given: database error When: finding by IP Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockRejectedValue(new Error('IP lookup failed'));

      // Act & Assert
      await expect(repository.findSessionsByIpAddress('192.168.1.1', 'org-123')).rejects.toThrow(
        'IP lookup failed'
      );
    });
  });

  describe('findSessionsByUserAgent', () => {
    it('Given: sessions with user agent exist When: finding Then: should return them', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockResolvedValue([mockSessionData]);

      // Act
      const result = await repository.findSessionsByUserAgent('Mozilla/5.0', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].userAgent).toBe('Mozilla/5.0');
    });

    it('Given: database error When: finding by user agent Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockRejectedValue(new Error('User agent lookup failed'));

      // Act & Assert
      await expect(repository.findSessionsByUserAgent('Mozilla/5.0', 'org-123')).rejects.toThrow(
        'User agent lookup failed'
      );
    });
  });

  describe('findSessionsByDateRange', () => {
    it('Given: sessions in date range When: finding Then: should return them', async () => {
      // Arrange
      const startDate = new Date(Date.now() - 86400000); // 1 day ago
      const endDate = new Date();
      mockPrismaService.session.findMany.mockResolvedValue([mockSessionData]);

      // Act
      const result = await repository.findSessionsByDateRange(startDate, endDate, 'org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding by date range Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockRejectedValue(new Error('Date range query failed'));

      // Act & Assert
      await expect(
        repository.findSessionsByDateRange(new Date(), new Date(), 'org-123')
      ).rejects.toThrow('Date range query failed');
    });
  });

  describe('countActiveSessions', () => {
    it('Given: active sessions exist When: counting Then: should return count', async () => {
      // Arrange
      mockPrismaService.session.count.mockResolvedValue(5);

      // Act
      const result = await repository.countActiveSessions('user-123', 'org-123');

      // Assert
      expect(result).toBe(5);
    });

    it('Given: database error When: counting Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.count.mockRejectedValue(new Error('Count failed'));

      // Act & Assert
      await expect(repository.countActiveSessions('user-123', 'org-123')).rejects.toThrow(
        'Count failed'
      );
    });
  });

  describe('countActiveByUserId', () => {
    it('Given: active sessions exist When: counting by userId Then: should return count', async () => {
      // Arrange
      mockPrismaService.session.count.mockResolvedValue(3);

      // Act
      const result = await repository.countActiveByUserId('user-123', 'org-123');

      // Assert
      expect(result).toBe(3);
    });
  });

  describe('deleteExpiredSessions', () => {
    it('Given: expired sessions exist When: deleting expired Then: should return count', async () => {
      // Arrange
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 10 });

      // Act
      const result = await repository.deleteExpiredSessions();

      // Assert
      expect(result).toBe(10);
    });

    it('Given: database error When: deleting expired Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.deleteMany.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.deleteExpiredSessions()).rejects.toThrow('Delete failed');
    });
  });

  describe('deleteExpired', () => {
    it('Given: expired sessions for org exist When: deleting Then: should return count', async () => {
      // Arrange
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await repository.deleteExpired('org-123');

      // Assert
      expect(result).toBe(5);
    });

    it('Given: database error When: deleting expired for org Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.deleteMany.mockRejectedValue(new Error('Org delete failed'));

      // Act & Assert
      await expect(repository.deleteExpired('org-123')).rejects.toThrow('Org delete failed');
    });
  });

  describe('deleteSessionsByUserId', () => {
    it('Given: sessions for user exist When: deleting Then: should return count', async () => {
      // Arrange
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 3 });

      // Act
      const result = await repository.deleteSessionsByUserId('user-123', 'org-123');

      // Assert
      expect(result).toBe(3);
    });

    it('Given: database error When: deleting by userId Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.deleteMany.mockRejectedValue(
        new Error('User session delete failed')
      );

      // Act & Assert
      await expect(repository.deleteSessionsByUserId('user-123', 'org-123')).rejects.toThrow(
        'User session delete failed'
      );
    });
  });

  describe('deleteSessionsByToken', () => {
    it('Given: session with token exists When: deleting Then: should return count', async () => {
      // Arrange
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await repository.deleteSessionsByToken('jwt-token-123');

      // Assert
      expect(result).toBe(1);
    });

    it('Given: database error When: deleting by token Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.deleteMany.mockRejectedValue(new Error('Token delete failed'));

      // Act & Assert
      await expect(repository.deleteSessionsByToken('token')).rejects.toThrow(
        'Token delete failed'
      );
    });
  });

  describe('save', () => {
    it('Given: session When: saving Then: should upsert session', async () => {
      // Arrange
      const session = Session.reconstitute(
        {
          userId: 'user-123',
          token: 'new-token',
          expiresAt: new Date(Date.now() + 3600000),
          isActive: true,
          ipAddress: '10.0.0.1',
          userAgent: 'Chrome/100',
        },
        'session-456',
        'org-123'
      );
      mockPrismaService.session.upsert.mockResolvedValue({
        ...mockSessionData,
        id: 'session-456',
        token: 'new-token',
      });

      // Act
      const result = await repository.save(session);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.session.upsert).toHaveBeenCalled();
    });

    it('Given: database error When: saving Then: should throw error', async () => {
      // Arrange
      const session = Session.reconstitute(
        {
          userId: 'user-123',
          token: 'token',
          expiresAt: new Date(),
          isActive: true,
        },
        'session-123',
        'org-123'
      );
      mockPrismaService.session.upsert.mockRejectedValue(new Error('Upsert failed'));

      // Act & Assert
      await expect(repository.save(session)).rejects.toThrow('Upsert failed');
    });
  });

  describe('delete', () => {
    it('Given: existing session When: deleting Then: should delete session', async () => {
      // Arrange
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await repository.delete('session-123', 'org-123');

      // Assert
      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        where: { id: 'session-123', user: { orgId: 'org-123' } },
      });
    });

    it('Given: database error When: deleting Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.deleteMany.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.delete('session-123', 'org-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('exists', () => {
    it('Given: existing session When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.session.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('session-123', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: non-existing session When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.session.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.count.mockRejectedValue(new Error('Existence check failed'));

      // Act & Assert
      await expect(repository.exists('session-123', 'org-123')).rejects.toThrow(
        'Existence check failed'
      );
    });
  });

  describe('findAll', () => {
    it('Given: sessions exist When: finding all Then: should return all sessions', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockResolvedValue([mockSessionData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: no sessions When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding all Then: should throw error', async () => {
      // Arrange
      mockPrismaService.session.findMany.mockRejectedValue(new Error('FindAll failed'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('FindAll failed');
    });
  });
});
