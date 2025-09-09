// Prisma Service Tests - Servicio de Base de Datos
// Tests unitarios para el servicio de Prisma siguiendo AAA y Given-When-Then

import { PrismaService } from '@infrastructure/database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
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
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('Given: service instance When: calling onModuleDestroy Then: should disconnect from database', async () => {
      // Arrange
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('Given: connection error When: calling onModuleInit Then: should propagate error', async () => {
      // Arrange
      const connectError = new Error('Connection failed');
      const connectSpy = jest.spyOn(service, '$connect').mockRejectedValue(connectError);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('Given: disconnection error When: calling onModuleDestroy Then: should propagate error', async () => {
      // Arrange
      const disconnectError = new Error('Disconnection failed');
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockRejectedValue(disconnectError);

      // Act & Assert
      await expect(service.onModuleDestroy()).rejects.toThrow('Disconnection failed');
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });
});
