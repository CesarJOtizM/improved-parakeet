// Prisma Service Tests - Servicio de Base de Datos
// Tests unitarios para el servicio de Prisma siguiendo AAA y Given-When-Then

import { PrismaService } from '@infrastructure/database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';

// Mock PrismaClient for testing (Prisma 7 requires valid configuration)
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockQueryRaw = jest.fn();

jest.mock('@infrastructure/database/generated/prisma', () => {
  class MockPrismaClient {
    $connect = mockConnect;
    $disconnect = mockDisconnect;
    $queryRaw = mockQueryRaw;
  }
  return {
    PrismaClient: MockPrismaClient,
  };
});

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service initialization', () => {
    it('Given: service created When: checking type Then: should have correct type', () => {
      // Arrange & Act
      const serviceType = typeof service;

      // Assert
      expect(serviceType).toBe('object');
    });

    it('Given: service created When: checking methods Then: should have expected methods', () => {
      // Arrange & Act
      const hasQueryRaw = typeof service.$queryRaw === 'function';
      const hasConnect = typeof service.$connect === 'function';
      const hasDisconnect = typeof service.$disconnect === 'function';

      // Assert
      expect(hasQueryRaw).toBe(true);
      expect(hasConnect).toBe(true);
      expect(hasDisconnect).toBe(true);
    });
  });

  describe('Module lifecycle methods', () => {
    it('Given: service instance When: calling onModuleInit Then: should connect to database', async () => {
      // Arrange
      mockConnect.mockResolvedValue(undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('Given: service instance When: calling onModuleDestroy Then: should disconnect from database', async () => {
      // Arrange
      mockDisconnect.mockResolvedValue(undefined);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('Given: connection error When: calling onModuleInit Then: should propagate error', async () => {
      // Arrange
      const connectError = new Error('Connection failed');
      mockConnect.mockRejectedValue(connectError);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('Given: disconnection error When: calling onModuleDestroy Then: should propagate error', async () => {
      // Arrange
      const disconnectError = new Error('Disconnection failed');
      mockDisconnect.mockRejectedValue(disconnectError);

      // Act & Assert
      await expect(service.onModuleDestroy()).rejects.toThrow('Disconnection failed');
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });
});
