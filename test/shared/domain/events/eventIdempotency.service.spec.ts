import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { EventIdempotencyService } from '@shared/domain/events/eventIdempotency.service';

import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('EventIdempotencyService', () => {
  let service: EventIdempotencyService;
  let mockPrisma: {
    processedEvent: {
      create: jest.Mock<any>;
      findUnique: jest.Mock<any>;
      deleteMany: jest.Mock<any>;
    };
  };

  const testEventType = 'MovementPostedEvent';
  const testEventId = 'movement-123';
  const testOrgId = 'org-456';

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      processedEvent: {
        create: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    service = new EventIdempotencyService(mockPrisma as unknown as PrismaService);
  });

  describe('tryMarkAsProcessed', () => {
    it('Given: event has not been processed before When: marking as processed Then: should return true', async () => {
      // Arrange
      mockPrisma.processedEvent.create.mockResolvedValue({
        id: 'record-1',
        eventType: testEventType,
        eventId: testEventId,
        orgId: testOrgId,
        processedAt: new Date(),
      });

      // Act
      const result = await service.tryMarkAsProcessed(testEventType, testEventId, testOrgId);

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.processedEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: testEventType,
          eventId: testEventId,
          orgId: testOrgId,
        },
      });
    });

    it('Given: event has already been processed When: marking as processed Then: should return false', async () => {
      // Arrange
      const uniqueConstraintError = { code: 'P2002', message: 'Unique constraint failed' };
      mockPrisma.processedEvent.create.mockRejectedValue(uniqueConstraintError);

      // Act
      const result = await service.tryMarkAsProcessed(testEventType, testEventId, testOrgId);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: a database error occurs When: marking as processed Then: should throw the error', async () => {
      // Arrange
      const dbError = new Error('Connection refused');
      mockPrisma.processedEvent.create.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.tryMarkAsProcessed(testEventType, testEventId, testOrgId)
      ).rejects.toThrow('Connection refused');
    });

    it('Given: an error without code property When: marking as processed Then: should throw the error', async () => {
      // Arrange
      const unknownError = { message: 'Something went wrong' };
      mockPrisma.processedEvent.create.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(
        service.tryMarkAsProcessed(testEventType, testEventId, testOrgId)
      ).rejects.toEqual(unknownError);
    });

    it('Given: a non-P2002 Prisma error When: marking as processed Then: should throw the error', async () => {
      // Arrange
      const otherPrismaError = { code: 'P2025', message: 'Record not found' };
      mockPrisma.processedEvent.create.mockRejectedValue(otherPrismaError);

      // Act & Assert
      await expect(
        service.tryMarkAsProcessed(testEventType, testEventId, testOrgId)
      ).rejects.toEqual(otherPrismaError);
    });
  });

  describe('isProcessed', () => {
    it('Given: event exists in database When: checking if processed Then: should return true', async () => {
      // Arrange
      mockPrisma.processedEvent.findUnique.mockResolvedValue({
        id: 'record-1',
        eventType: testEventType,
        eventId: testEventId,
        orgId: testOrgId,
        processedAt: new Date(),
      });

      // Act
      const result = await service.isProcessed(testEventType, testEventId, testOrgId);

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.processedEvent.findUnique).toHaveBeenCalledWith({
        where: {
          eventType_eventId_orgId: {
            eventType: testEventType,
            eventId: testEventId,
            orgId: testOrgId,
          },
        },
      });
    });

    it('Given: event does not exist in database When: checking if processed Then: should return false', async () => {
      // Arrange
      mockPrisma.processedEvent.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.isProcessed(testEventType, testEventId, testOrgId);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: a database error occurs When: checking if processed Then: should propagate the error', async () => {
      // Arrange
      mockPrisma.processedEvent.findUnique.mockRejectedValue(new Error('DB timeout'));

      // Act & Assert
      await expect(service.isProcessed(testEventType, testEventId, testOrgId)).rejects.toThrow(
        'DB timeout'
      );
    });
  });

  describe('removeProcessedMark', () => {
    it('Given: event mark exists When: removing it Then: should delete the record', async () => {
      // Arrange
      mockPrisma.processedEvent.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await service.removeProcessedMark(testEventType, testEventId, testOrgId);

      // Assert
      expect(mockPrisma.processedEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          eventType: testEventType,
          eventId: testEventId,
          orgId: testOrgId,
        },
      });
    });

    it('Given: event mark does not exist When: removing it Then: should complete without error', async () => {
      // Arrange
      mockPrisma.processedEvent.deleteMany.mockResolvedValue({ count: 0 });

      // Act & Assert
      await expect(
        service.removeProcessedMark(testEventType, testEventId, testOrgId)
      ).resolves.toBeUndefined();
    });
  });

  describe('cleanupOldRecords', () => {
    it('Given: old records exist When: cleaning up with default days Then: should delete records older than 30 days', async () => {
      // Arrange
      mockPrisma.processedEvent.deleteMany.mockResolvedValue({ count: 15 });

      // Act
      const result = await service.cleanupOldRecords();

      // Assert
      expect(result).toBe(15);
      expect(mockPrisma.processedEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          processedAt: {
            lt: expect.any(Date),
          },
        },
      });

      // Verify the cutoff is approximately 30 days ago
      const callArg = mockPrisma.processedEvent.deleteMany.mock.calls[0]![0] as {
        where: { processedAt: { lt: Date } };
      };
      const cutoffDate = callArg.where.processedAt.lt;
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 30);
      const diffMs = Math.abs(cutoffDate.getTime() - expectedCutoff.getTime());
      expect(diffMs).toBeLessThan(1000);
    });

    it('Given: old records exist When: cleaning up with custom days Then: should use the custom cutoff', async () => {
      // Arrange
      mockPrisma.processedEvent.deleteMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await service.cleanupOldRecords(7);

      // Assert
      expect(result).toBe(5);
      expect(mockPrisma.processedEvent.deleteMany).toHaveBeenCalledTimes(1);

      const callArg = mockPrisma.processedEvent.deleteMany.mock.calls[0]![0] as {
        where: { processedAt: { lt: Date } };
      };
      const cutoffDate = callArg.where.processedAt.lt;

      // The cutoff should be approximately 7 days ago
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 7);
      const diffMs = Math.abs(cutoffDate.getTime() - expectedCutoff.getTime());
      expect(diffMs).toBeLessThan(1000); // within 1 second tolerance
    });

    it('Given: no old records exist When: cleaning up Then: should return zero', async () => {
      // Arrange
      mockPrisma.processedEvent.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await service.cleanupOldRecords();

      // Assert
      expect(result).toBe(0);
      expect(mockPrisma.processedEvent.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
