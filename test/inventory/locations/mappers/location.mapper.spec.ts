/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from '@jest/globals';
import { LocationMapper } from '@location/mappers/location.mapper';
import { Location } from '@location/domain/entities/location.entity';

// Type representing Prisma Location model
interface PrismaLocationMock {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  warehouseId: string;
  parentId: string | null;
  isActive: boolean;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

const createPrismaLocation = (overrides?: Partial<PrismaLocationMock>): PrismaLocationMock => ({
  id: 'loc-001',
  code: 'ZONE-A1',
  name: 'Zone A1',
  description: 'Main storage zone',
  type: 'ZONE',
  warehouseId: 'wh-001',
  parentId: null,
  isActive: true,
  orgId: 'org-001',
  createdAt: new Date('2026-01-15T10:00:00Z'),
  updatedAt: new Date('2026-01-20T15:30:00Z'),
  ...overrides,
});

describe('LocationMapper', () => {
  describe('toDomain', () => {
    it('Given: complete Prisma location When: mapping to domain Then: should return Location entity with correct properties', () => {
      // Arrange
      const prismaLocation = createPrismaLocation();

      // Act
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Assert
      expect(location).toBeInstanceOf(Location);
      expect(location.id).toBe('loc-001');
      expect(location.orgId).toBe('org-001');
      expect(location.code.getValue()).toBe('ZONE-A1');
      expect(location.name).toBe('Zone A1');
      expect(location.description).toBe('Main storage zone');
      expect(location.type.getValue()).toBe('ZONE');
      expect(location.warehouseId).toBe('wh-001');
      expect(location.parentId).toBeUndefined();
      expect(location.isActive).toBe(true);
    });

    it('Given: Prisma location with null description When: mapping to domain Then: description should be undefined', () => {
      // Arrange
      const prismaLocation = createPrismaLocation({ description: null });

      // Act
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Assert
      expect(location.description).toBeUndefined();
    });

    it('Given: Prisma location with parentId When: mapping to domain Then: should preserve parentId', () => {
      // Arrange
      const prismaLocation = createPrismaLocation({ parentId: 'loc-parent-001' });

      // Act
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Assert
      expect(location.parentId).toBe('loc-parent-001');
    });

    it('Given: Prisma location with null parentId When: mapping to domain Then: parentId should be undefined', () => {
      // Arrange
      const prismaLocation = createPrismaLocation({ parentId: null });

      // Act
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Assert
      expect(location.parentId).toBeUndefined();
    });

    it('Given: inactive Prisma location When: mapping to domain Then: isActive should be false', () => {
      // Arrange
      const prismaLocation = createPrismaLocation({ isActive: false });

      // Act
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Assert
      expect(location.isActive).toBe(false);
    });

    it('Given: Prisma location with BIN type When: mapping to domain Then: type should be BIN', () => {
      // Arrange
      const prismaLocation = createPrismaLocation({ type: 'BIN', code: 'BIN-01' });

      // Act
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Assert
      expect(location.type.getValue()).toBe('BIN');
    });
  });

  describe('toPersistence', () => {
    it('Given: domain Location When: mapping to persistence Then: should return correct Prisma-compatible object', () => {
      // Arrange
      const prismaLocation = createPrismaLocation();
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Act
      const persistence = LocationMapper.toPersistence(location);

      // Assert
      expect(persistence.id).toBe('loc-001');
      expect(persistence.code).toBe('ZONE-A1');
      expect(persistence.name).toBe('Zone A1');
      expect(persistence.description).toBe('Main storage zone');
      expect(persistence.type).toBe('ZONE');
      expect(persistence.warehouseId).toBe('wh-001');
      expect(persistence.parentId).toBeNull();
      expect(persistence.isActive).toBe(true);
      expect(persistence.orgId).toBe('org-001');
    });

    it('Given: domain Location with undefined description When: mapping to persistence Then: description should be null', () => {
      // Arrange
      const prismaLocation = createPrismaLocation({ description: null });
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Act
      const persistence = LocationMapper.toPersistence(location);

      // Assert
      expect(persistence.description).toBeNull();
    });

    it('Given: domain Location with parentId When: mapping to persistence Then: should preserve parentId', () => {
      // Arrange
      const prismaLocation = createPrismaLocation({ parentId: 'loc-parent-001' });
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Act
      const persistence = LocationMapper.toPersistence(location);

      // Assert
      expect(persistence.parentId).toBe('loc-parent-001');
    });

    it('Given: domain Location without parentId When: mapping to persistence Then: parentId should be null', () => {
      // Arrange
      const prismaLocation = createPrismaLocation({ parentId: null });
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Act
      const persistence = LocationMapper.toPersistence(location);

      // Assert
      expect(persistence.parentId).toBeNull();
    });
  });

  describe('toResponseData', () => {
    it('Given: domain Location When: mapping to response data Then: should return correct response shape', () => {
      // Arrange
      const prismaLocation = createPrismaLocation();
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Act
      const responseData = LocationMapper.toResponseData(location);

      // Assert
      expect(responseData.id).toBe('loc-001');
      expect(responseData.code).toBe('ZONE-A1');
      expect(responseData.name).toBe('Zone A1');
      expect(responseData.description).toBe('Main storage zone');
      expect(responseData.type).toBe('ZONE');
      expect(responseData.warehouseId).toBe('wh-001');
      expect(responseData.parentId).toBeUndefined();
      expect(responseData.isActive).toBe(true);
      expect(responseData.orgId).toBe('org-001');
      expect(responseData.createdAt).toBeInstanceOf(Date);
      expect(responseData.updatedAt).toBeInstanceOf(Date);
    });

    it('Given: domain Location with description When: mapping to response Then: description should be present', () => {
      // Arrange
      const prismaLocation = createPrismaLocation({ description: 'Cold storage area' });
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Act
      const responseData = LocationMapper.toResponseData(location);

      // Assert
      expect(responseData.description).toBe('Cold storage area');
    });

    it('Given: domain Location without description When: mapping to response Then: description should be undefined', () => {
      // Arrange
      const prismaLocation = createPrismaLocation({ description: null });
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Act
      const responseData = LocationMapper.toResponseData(location);

      // Assert
      expect(responseData.description).toBeUndefined();
    });

    it('Given: domain Location with parentId When: mapping to response Then: parentId should be present', () => {
      // Arrange
      const prismaLocation = createPrismaLocation({ parentId: 'loc-parent-001' });
      const location = LocationMapper.toDomain(prismaLocation as any);

      // Act
      const responseData = LocationMapper.toResponseData(location);

      // Assert
      expect(responseData.parentId).toBe('loc-parent-001');
    });
  });

  describe('roundtrip: toDomain → toPersistence', () => {
    it('Given: Prisma location When: roundtripping through domain Then: should preserve all data', () => {
      // Arrange
      const original = createPrismaLocation({
        description: 'Test zone',
        parentId: 'parent-001',
      });

      // Act
      const domain = LocationMapper.toDomain(original as any);
      const persisted = LocationMapper.toPersistence(domain);

      // Assert
      expect(persisted.id).toBe(original.id);
      expect(persisted.code).toBe(original.code);
      expect(persisted.name).toBe(original.name);
      expect(persisted.description).toBe(original.description);
      expect(persisted.type).toBe(original.type);
      expect(persisted.warehouseId).toBe(original.warehouseId);
      expect(persisted.parentId).toBe(original.parentId);
      expect(persisted.isActive).toBe(original.isActive);
      expect(persisted.orgId).toBe(original.orgId);
    });

    it('Given: Prisma location with null fields When: roundtripping Then: null-to-undefined-to-null should be preserved', () => {
      // Arrange
      const original = createPrismaLocation({
        description: null,
        parentId: null,
      });

      // Act
      const domain = LocationMapper.toDomain(original as any);
      const persisted = LocationMapper.toPersistence(domain);

      // Assert - null in Prisma → undefined in domain → null in persistence
      expect(domain.description).toBeUndefined();
      expect(domain.parentId).toBeUndefined();
      expect(persisted.description).toBeNull();
      expect(persisted.parentId).toBeNull();
    });
  });
});
