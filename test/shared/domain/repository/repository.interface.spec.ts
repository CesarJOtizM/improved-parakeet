import { Entity } from '@shared/domain/base/entity.base';

import type { IReadRepository, IWriteRepository } from '@shared/domain/repository';

// Mock entity for testing
class MockEntity extends Entity<{ name: string }> {
  constructor(props: { name: string }, id?: string, orgId?: string) {
    super(props, id, orgId);
  }
}

describe('Repository Interfaces', () => {
  describe('IReadRepository', () => {
    it('Given: IReadRepository interface When: checking structure Then: should have correct methods', () => {
      // Arrange & Act
      const mockReadRepository: IReadRepository<MockEntity> = {
        findById: jest.fn(),
        findAll: jest.fn(),
        exists: jest.fn(),
      };

      // Assert
      expect(typeof mockReadRepository.findById).toBe('function');
      expect(typeof mockReadRepository.findAll).toBe('function');
      expect(typeof mockReadRepository.exists).toBe('function');
    });

    it('Given: IReadRepository When: calling findById Then: should return Promise<Entity | null>', async () => {
      // Arrange
      const mockReadRepository: IReadRepository<MockEntity> = {
        findById: jest
          .fn()
          .mockResolvedValue(new MockEntity({ name: 'test' }, 'test-id', 'org-123')),
        findAll: jest.fn(),
        exists: jest.fn(),
      };

      // Act
      const result = await mockReadRepository.findById('test-id', 'org-123');

      // Assert
      expect(result).toBeInstanceOf(MockEntity);
      expect(result?.id).toBe('test-id');
      expect(result?.orgId).toBe('org-123');
      expect(mockReadRepository.findById).toHaveBeenCalledWith('test-id', 'org-123');
    });

    it('Given: IReadRepository When: calling findAll Then: should return Promise<Entity[]>', async () => {
      // Arrange
      const entities = [
        new MockEntity({ name: 'test1' }, 'id1', 'org-123'),
        new MockEntity({ name: 'test2' }, 'id2', 'org-123'),
      ];
      const mockReadRepository: IReadRepository<MockEntity> = {
        findById: jest.fn(),
        findAll: jest.fn().mockResolvedValue(entities),
        exists: jest.fn(),
      };

      // Act
      const result = await mockReadRepository.findAll('org-123');

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(MockEntity);
      expect(result[1]).toBeInstanceOf(MockEntity);
      expect(mockReadRepository.findAll).toHaveBeenCalledWith('org-123');
    });

    it('Given: IReadRepository When: calling exists Then: should return Promise<boolean>', async () => {
      // Arrange
      const mockReadRepository: IReadRepository<MockEntity> = {
        findById: jest.fn(),
        findAll: jest.fn(),
        exists: jest.fn().mockResolvedValue(true),
      };

      // Act
      const result = await mockReadRepository.exists('test-id', 'org-123');

      // Assert
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
      expect(mockReadRepository.exists).toHaveBeenCalledWith('test-id', 'org-123');
    });
  });

  describe('IWriteRepository', () => {
    it('Given: IWriteRepository interface When: checking structure Then: should have correct methods', () => {
      // Arrange & Act
      const mockWriteRepository: IWriteRepository<MockEntity> = {
        save: jest.fn(),
        delete: jest.fn(),
      };

      // Assert
      expect(typeof mockWriteRepository.save).toBe('function');
      expect(typeof mockWriteRepository.delete).toBe('function');
    });

    it('Given: IWriteRepository When: calling save Then: should return Promise<Entity>', async () => {
      // Arrange
      const entity = new MockEntity({ name: 'test' }, 'test-id', 'org-123');
      const mockWriteRepository: IWriteRepository<MockEntity> = {
        save: jest.fn().mockResolvedValue(entity),
        delete: jest.fn(),
      };

      // Act
      const result = await mockWriteRepository.save(entity);

      // Assert
      expect(result).toBeInstanceOf(MockEntity);
      expect(result.id).toBe('test-id');
      expect(mockWriteRepository.save).toHaveBeenCalledWith(entity);
    });

    it('Given: IWriteRepository When: calling delete Then: should return Promise<void>', async () => {
      // Arrange
      const mockWriteRepository: IWriteRepository<MockEntity> = {
        save: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      // Act
      const result = await mockWriteRepository.delete('test-id', 'org-123');

      // Assert
      expect(result).toBeUndefined();
      expect(mockWriteRepository.delete).toHaveBeenCalledWith('test-id', 'org-123');
    });
  });
});
