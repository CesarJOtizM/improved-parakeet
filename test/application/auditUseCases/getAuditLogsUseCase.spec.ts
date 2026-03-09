import { GetAuditLogsUseCase } from '@application/auditUseCases/getAuditLogsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuditLog, type IAuditLogProps } from '@shared/audit/domain/entities/auditLog.entity';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

describe('GetAuditLogsUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockAuditLogId = 'audit-log-123';

  let useCase: GetAuditLogsUseCase;
  let mockAuditRepository: jest.Mocked<IAuditLogRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuditRepository = {
      save: jest.fn(),
      saveBatch: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      findByEntity: jest.fn(),
      findByUser: jest.fn(),
      findByAction: jest.fn(),
      findByDateRange: jest.fn(),
      findByFilters: jest.fn(),
      countByFilters: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IAuditLogRepository>;

    useCase = new GetAuditLogsUseCase(mockAuditRepository);
  });

  describe('execute', () => {
    const createMockAuditLog = (overrides?: Partial<IAuditLogProps>): AuditLog => {
      const props: IAuditLogProps = {
        entityType: EntityType.create('User'),
        action: AuditAction.create('CREATE'),
        metadata: AuditMetadata.create({ userId: 'user-123' }),
        performedBy: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: '/api/users',
        httpStatusCode: 201,
        duration: 150,
        ...overrides,
      };
      return AuditLog.reconstitute(props, mockAuditLogId, mockOrgId);
    };

    it('Given: valid request without filters When: getting audit logs Then: should return paginated audit logs', async () => {
      // Arrange
      const mockAuditLogs = [
        createMockAuditLog({ entityId: 'entity-1' }),
        createMockAuditLog({ entityId: 'entity-2' }),
      ];
      mockAuditRepository.findAll.mockResolvedValue(mockAuditLogs);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 50,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(2);
          expect(value.data[0].id).toBe(mockAuditLogId);
          expect(value.data[0].entityType).toBe('User');
          expect(value.data[0].action).toBe('CREATE');
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(50);
          expect(value.pagination.total).toBe(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findAll).toHaveBeenCalledWith(mockOrgId);
    });

    it('Given: request with entityType filter When: getting audit logs Then: should return filtered audit logs', async () => {
      // Arrange
      const mockAuditLogs = [createMockAuditLog({ entityId: 'entity-1' })];
      mockAuditRepository.findBySpecification.mockResolvedValue({
        data: mockAuditLogs,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        entityType: 'User',
        page: 1,
        limit: 50,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(1);
          expect(value.data[0].entityType).toBe('User');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with date range filter When: getting audit logs Then: should return filtered audit logs', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockAuditLogs = [createMockAuditLog({ entityId: 'entity-1' })];
      mockAuditRepository.findBySpecification.mockResolvedValue({
        data: mockAuditLogs,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        startDate,
        endDate,
        page: 1,
        limit: 50,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(1);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with pagination When: getting audit logs Then: should return paginated results', async () => {
      // Arrange
      const mockAuditLogs = Array.from({ length: 100 }, (_, i) =>
        createMockAuditLog({ entityId: `entity-${i}` })
      );
      mockAuditRepository.findAll.mockResolvedValue(mockAuditLogs);

      const request = {
        orgId: mockOrgId,
        page: 2,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(10);
          expect(value.pagination.page).toBe(2);
          expect(value.pagination.limit).toBe(10);
          expect(value.pagination.total).toBe(100);
          expect(value.pagination.hasNext).toBe(true);
          expect(value.pagination.hasPrev).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with all filters When: getting audit logs Then: should apply all filters', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockAuditLogs = [createMockAuditLog({ entityId: 'entity-1' })];
      mockAuditRepository.findBySpecification.mockResolvedValue({
        data: mockAuditLogs,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        entityType: 'User',
        entityId: 'entity-1',
        action: 'CREATE',
        performedBy: 'user-123',
        startDate,
        endDate,
        page: 1,
        limit: 50,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(1);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with entityId filter only When: getting audit logs Then: should use specification', async () => {
      // Arrange
      const mockAuditLogs = [createMockAuditLog({ entityId: 'entity-specific' })];
      mockAuditRepository.findBySpecification.mockResolvedValue({
        data: mockAuditLogs,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        entityId: 'entity-specific',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockAuditRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with action filter only When: getting audit logs Then: should use specification', async () => {
      // Arrange
      const mockAuditLogs = [createMockAuditLog()];
      mockAuditRepository.findBySpecification.mockResolvedValue({
        data: mockAuditLogs,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        action: 'CREATE',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockAuditRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with performedBy filter only When: getting audit logs Then: should use specification', async () => {
      // Arrange
      const mockAuditLogs = [createMockAuditLog()];
      mockAuditRepository.findBySpecification.mockResolvedValue({
        data: mockAuditLogs,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        performedBy: 'user-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockAuditRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with httpMethod filter only When: getting audit logs Then: should use specification', async () => {
      // Arrange
      const mockAuditLogs = [createMockAuditLog()];
      mockAuditRepository.findBySpecification.mockResolvedValue({
        data: mockAuditLogs,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        httpMethod: 'POST',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockAuditRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with no page/limit When: getting audit logs Then: should use defaults (page=1, limit=50)', async () => {
      // Arrange
      const mockAuditLogs = [createMockAuditLog({ entityId: 'entity-1' })];
      mockAuditRepository.findAll.mockResolvedValue(mockAuditLogs);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(50);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: empty result When: getting audit logs Then: should return empty data with correct pagination', async () => {
      // Arrange
      mockAuditRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(0);
          expect(value.pagination.total).toBe(0);
          expect(value.pagination.totalPages).toBe(0);
          expect(value.pagination.hasNext).toBe(false);
          expect(value.pagination.hasPrev).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: first page of results When: getting audit logs Then: hasPrev should be false', async () => {
      // Arrange
      const mockAuditLogs = Array.from({ length: 20 }, (_, i) =>
        createMockAuditLog({ entityId: `entity-${i}` })
      );
      mockAuditRepository.findAll.mockResolvedValue(mockAuditLogs);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.hasNext).toBe(true);
          expect(value.pagination.hasPrev).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: last page of results When: getting audit logs Then: hasNext should be false', async () => {
      // Arrange
      const mockAuditLogs = Array.from({ length: 15 }, (_, i) =>
        createMockAuditLog({ entityId: `entity-${i}` })
      );
      mockAuditRepository.findAll.mockResolvedValue(mockAuditLogs);

      const request = {
        orgId: mockOrgId,
        page: 2,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(5);
          expect(value.pagination.hasNext).toBe(false);
          expect(value.pagination.hasPrev).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    describe('sorting', () => {
      const createSortableLogs = () => {
        const log1 = createMockAuditLog({
          entityId: 'e-1',
          action: AuditAction.create('CREATE'),
          entityType: EntityType.create('Product'),
          httpMethod: 'POST',
          httpStatusCode: 201,
        });
        // Override createdAt for sorting
        Object.defineProperty(log1, 'createdAt', { value: new Date('2024-01-01'), writable: true });

        const log2 = createMockAuditLog({
          entityId: 'e-2',
          action: AuditAction.create('UPDATE'),
          entityType: EntityType.create('User'),
          httpMethod: 'PUT',
          httpStatusCode: 200,
        });
        Object.defineProperty(log2, 'createdAt', { value: new Date('2024-01-02'), writable: true });

        const log3 = createMockAuditLog({
          entityId: 'e-3',
          action: AuditAction.create('DELETE'),
          entityType: EntityType.create('Sale'),
          httpMethod: undefined,
          httpStatusCode: undefined,
        });
        Object.defineProperty(log3, 'createdAt', { value: new Date('2024-01-03'), writable: true });

        return [log1, log2, log3];
      };

      it('Given: sortBy action asc When: getting audit logs Then: should sort by action ascending', async () => {
        const logs = createSortableLogs();
        mockAuditRepository.findAll.mockResolvedValue(logs);

        const result = await useCase.execute({
          orgId: mockOrgId,
          sortBy: 'action',
          sortOrder: 'asc',
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(value.data[0].action).toBe('CREATE');
            expect(value.data[1].action).toBe('DELETE');
            expect(value.data[2].action).toBe('UPDATE');
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: sortBy action desc When: getting audit logs Then: should sort by action descending', async () => {
        const logs = createSortableLogs();
        mockAuditRepository.findAll.mockResolvedValue(logs);

        const result = await useCase.execute({
          orgId: mockOrgId,
          sortBy: 'action',
          sortOrder: 'desc',
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(value.data[0].action).toBe('UPDATE');
            expect(value.data[1].action).toBe('DELETE');
            expect(value.data[2].action).toBe('CREATE');
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: sortBy entityType asc When: getting audit logs Then: should sort by entityType ascending', async () => {
        const logs = createSortableLogs();
        mockAuditRepository.findAll.mockResolvedValue(logs);

        const result = await useCase.execute({
          orgId: mockOrgId,
          sortBy: 'entityType',
          sortOrder: 'asc',
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(value.data[0].entityType).toBe('Product');
            expect(value.data[1].entityType).toBe('Sale');
            expect(value.data[2].entityType).toBe('User');
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: sortBy entityType desc When: getting audit logs Then: should sort by entityType descending', async () => {
        const logs = createSortableLogs();
        mockAuditRepository.findAll.mockResolvedValue(logs);

        const result = await useCase.execute({
          orgId: mockOrgId,
          sortBy: 'entityType',
          sortOrder: 'desc',
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(value.data[0].entityType).toBe('User');
            expect(value.data[1].entityType).toBe('Sale');
            expect(value.data[2].entityType).toBe('Product');
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: sortBy httpMethod asc When: getting audit logs Then: should sort with empty string for undefined', async () => {
        const logs = createSortableLogs();
        mockAuditRepository.findAll.mockResolvedValue(logs);

        const result = await useCase.execute({
          orgId: mockOrgId,
          sortBy: 'httpMethod',
          sortOrder: 'asc',
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            // undefined -> '' comes first, then POST, then PUT
            expect(value.data[0].httpMethod).toBeNull();
            expect(value.data[1].httpMethod).toBe('POST');
            expect(value.data[2].httpMethod).toBe('PUT');
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: sortBy httpStatusCode asc When: getting audit logs Then: should sort numerically with 0 for undefined', async () => {
        const logs = createSortableLogs();
        mockAuditRepository.findAll.mockResolvedValue(logs);

        const result = await useCase.execute({
          orgId: mockOrgId,
          sortBy: 'httpStatusCode',
          sortOrder: 'asc',
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            // undefined -> 0 comes first, then 200, then 201
            expect(value.data[0].httpStatusCode).toBeNull();
            expect(value.data[1].httpStatusCode).toBe(200);
            expect(value.data[2].httpStatusCode).toBe(201);
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: sortBy createdAt asc When: getting audit logs Then: should sort by createdAt ascending', async () => {
        const logs = createSortableLogs();
        mockAuditRepository.findAll.mockResolvedValue(logs);

        const result = await useCase.execute({
          orgId: mockOrgId,
          sortBy: 'createdAt',
          sortOrder: 'asc',
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(new Date(value.data[0].createdAt).getTime()).toBeLessThanOrEqual(
              new Date(value.data[1].createdAt).getTime()
            );
            expect(new Date(value.data[1].createdAt).getTime()).toBeLessThanOrEqual(
              new Date(value.data[2].createdAt).getTime()
            );
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: sortBy unknown field (default case) When: getting audit logs Then: should sort by createdAt', async () => {
        const logs = createSortableLogs();
        mockAuditRepository.findAll.mockResolvedValue(logs);

        const result = await useCase.execute({
          orgId: mockOrgId,
          sortBy: 'unknownField',
          sortOrder: 'asc',
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(new Date(value.data[0].createdAt).getTime()).toBeLessThanOrEqual(
              new Date(value.data[1].createdAt).getTime()
            );
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: sortBy without sortOrder When: getting audit logs Then: should default to asc', async () => {
        const logs = createSortableLogs();
        mockAuditRepository.findAll.mockResolvedValue(logs);

        const result = await useCase.execute({
          orgId: mockOrgId,
          sortBy: 'action',
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            // Default asc: CREATE < DELETE < UPDATE
            expect(value.data[0].action).toBe('CREATE');
            expect(value.data[1].action).toBe('DELETE');
            expect(value.data[2].action).toBe('UPDATE');
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: equal values for sort When: sorting Then: should return 0 (stable sort)', async () => {
        const log1 = createMockAuditLog({
          entityId: 'e-1',
          action: AuditAction.create('CREATE'),
        });
        const log2 = createMockAuditLog({
          entityId: 'e-2',
          action: AuditAction.create('CREATE'),
        });
        mockAuditRepository.findAll.mockResolvedValue([log1, log2]);

        const result = await useCase.execute({
          orgId: mockOrgId,
          sortBy: 'action',
          sortOrder: 'asc',
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(value.data).toHaveLength(2);
            expect(value.data[0].action).toBe('CREATE');
            expect(value.data[1].action).toBe('CREATE');
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });
    });

    describe('response data mapping', () => {
      it('Given: audit log with null optional fields When: mapping Then: should map to null', async () => {
        const logWithNulls = createMockAuditLog({
          entityId: undefined,
          performedBy: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          httpMethod: undefined,
          httpUrl: undefined,
          httpStatusCode: undefined,
          duration: undefined,
        });
        mockAuditRepository.findAll.mockResolvedValue([logWithNulls]);

        const result = await useCase.execute({ orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            const item = value.data[0];
            expect(item.entityId).toBeNull();
            expect(item.performedBy).toBeNull();
            expect(item.ipAddress).toBeNull();
            expect(item.userAgent).toBeNull();
            expect(item.httpMethod).toBeNull();
            expect(item.httpUrl).toBeNull();
            expect(item.httpStatusCode).toBeNull();
            expect(item.duration).toBeNull();
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: audit log with all fields populated When: mapping Then: should map correctly', async () => {
        const fullLog = createMockAuditLog({
          entityId: 'ent-id',
          performedBy: 'user-1',
          ipAddress: '10.0.0.1',
          userAgent: 'TestAgent',
          httpMethod: 'GET',
          httpUrl: '/api/test',
          httpStatusCode: 200,
          duration: 50,
        });
        mockAuditRepository.findAll.mockResolvedValue([fullLog]);

        const result = await useCase.execute({ orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            const item = value.data[0];
            expect(item.entityId).toBe('ent-id');
            expect(item.performedBy).toBe('user-1');
            expect(item.ipAddress).toBe('10.0.0.1');
            expect(item.userAgent).toBe('TestAgent');
            expect(item.httpMethod).toBe('GET');
            expect(item.httpUrl).toBe('/api/test');
            expect(item.httpStatusCode).toBe(200);
            expect(item.duration).toBe(50);
            expect(item.orgId).toBe(mockOrgId);
            expect(item.createdAt).toBeDefined();
            expect(item.metadata).toBeDefined();
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });
    });

    describe('findAll fallback pagination', () => {
      it('Given: more items than page size in findAll path When: paginating Then: hasMore should reflect total', async () => {
        const mockAuditLogs = Array.from({ length: 5 }, (_, i) =>
          createMockAuditLog({ entityId: `entity-${i}` })
        );
        mockAuditRepository.findAll.mockResolvedValue(mockAuditLogs);

        const result = await useCase.execute({
          orgId: mockOrgId,
          page: 1,
          limit: 3,
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(value.data).toHaveLength(3);
            expect(value.pagination.total).toBe(5);
            expect(value.pagination.hasNext).toBe(true);
            expect(value.pagination.totalPages).toBe(2);
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: page beyond total When: paginating with findAll Then: should return empty data', async () => {
        const mockAuditLogs = Array.from({ length: 3 }, (_, i) =>
          createMockAuditLog({ entityId: `entity-${i}` })
        );
        mockAuditRepository.findAll.mockResolvedValue(mockAuditLogs);

        const result = await useCase.execute({
          orgId: mockOrgId,
          page: 5,
          limit: 10,
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(value.data).toHaveLength(0);
            expect(value.pagination.total).toBe(3);
            expect(value.pagination.hasNext).toBe(false);
            expect(value.pagination.hasPrev).toBe(true);
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });
    });

    describe('specification with hasMore from repository', () => {
      it('Given: specification with hasMore true When: getting audit logs Then: pagination reflects total', async () => {
        const mockAuditLogs = [createMockAuditLog({ entityId: 'entity-1' })];
        mockAuditRepository.findBySpecification.mockResolvedValue({
          data: mockAuditLogs,
          total: 100,
          hasMore: true,
        });

        const result = await useCase.execute({
          orgId: mockOrgId,
          entityType: 'User',
          page: 1,
          limit: 10,
        });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(value.pagination.total).toBe(100);
            expect(value.pagination.totalPages).toBe(10);
            expect(value.pagination.hasNext).toBe(true);
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });
    });
  });
});
