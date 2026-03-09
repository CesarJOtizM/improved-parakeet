/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuditController } from '@interface/http/audit/audit.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError, NotFoundError } from '@shared/domain/result/domainError';

describe('AuditController', () => {
  let controller: AuditController;
  let mockGetAuditLogsUseCase: any;
  let mockGetAuditLogUseCase: any;
  let mockGetUserActivityUseCase: any;
  let mockGetEntityHistoryUseCase: any;

  const mockOrgId = 'org-123';

  const mockAuditLogData = {
    id: 'audit-123',
    action: 'CREATE',
    entityType: 'Product',
    entityId: 'prod-123',
    performedBy: 'user-123',
    httpMethod: 'POST',
    httpStatusCode: 201,
    ipAddress: '127.0.0.1',
    orgId: mockOrgId,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockGetAuditLogsUseCase = { execute: jest.fn() };
    mockGetAuditLogUseCase = { execute: jest.fn() };
    mockGetUserActivityUseCase = { execute: jest.fn() };
    mockGetEntityHistoryUseCase = { execute: jest.fn() };

    controller = new AuditController(
      mockGetAuditLogsUseCase,
      mockGetAuditLogUseCase,
      mockGetUserActivityUseCase,
      mockGetEntityHistoryUseCase
    );
  });

  describe('getAuditLogs', () => {
    it('Given: valid query When: getting audit logs Then: should return logs list', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const logsResponse = {
        success: true,
        data: [mockAuditLogData],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        message: 'Audit logs retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetAuditLogsUseCase.execute.mockResolvedValue(ok(logsResponse));

      // Act
      const result = await controller.getAuditLogs(query as any, mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('audit-123');
      expect(mockGetAuditLogsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          page: 1,
          limit: 10,
        })
      );
    });

    it('Given: filters When: getting audit logs Then: should pass filters to use case', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 20,
        entityType: 'Product',
        action: 'CREATE',
        performedBy: 'user-123',
        httpMethod: 'POST',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      const logsResponse = {
        success: true,
        data: [mockAuditLogData],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        message: 'Audit logs retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetAuditLogsUseCase.execute.mockResolvedValue(ok(logsResponse));

      // Act
      const result = await controller.getAuditLogs(query as any, mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockGetAuditLogsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          entityType: 'Product',
          action: 'CREATE',
          performedBy: 'user-123',
          httpMethod: 'POST',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });

    it('Given: use case error When: getting audit logs Then: should throw', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      mockGetAuditLogsUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve audit logs'))
      );

      // Act & Assert
      await expect(controller.getAuditLogs(query as any, mockOrgId)).rejects.toThrow();
    });
  });

  describe('getAuditLog', () => {
    it('Given: valid audit log id When: getting log Then: should return log detail', async () => {
      // Arrange
      const logResponse = {
        success: true,
        data: {
          ...mockAuditLogData,
          requestBody: { name: 'Product 1' },
          responseBody: { id: 'prod-123' },
        },
        message: 'Audit log retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetAuditLogUseCase.execute.mockResolvedValue(ok(logResponse));

      // Act
      const result = await controller.getAuditLog('audit-123', mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('audit-123');
      expect(result.data.requestBody).toBeDefined();
      expect(mockGetAuditLogUseCase.execute).toHaveBeenCalledWith({
        id: 'audit-123',
        orgId: mockOrgId,
      });
    });

    it('Given: non-existent log id When: getting log Then: should throw not found', async () => {
      // Arrange
      mockGetAuditLogUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Audit log not found'))
      );

      // Act & Assert
      await expect(controller.getAuditLog('non-existent', mockOrgId)).rejects.toThrow();
    });

    it('Given: use case rejects When: getting log Then: should propagate error', async () => {
      // Arrange
      mockGetAuditLogUseCase.execute.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.getAuditLog('audit-123', mockOrgId)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getUserActivity', () => {
    it('Given: valid userId When: getting user activity Then: should return activity list', async () => {
      // Arrange
      const activityResponse = {
        success: true,
        data: [mockAuditLogData],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
        message: 'User activity retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetUserActivityUseCase.execute.mockResolvedValue(ok(activityResponse));

      // Act
      const result = await controller.getUserActivity('user-123', undefined, undefined, mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockGetUserActivityUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          orgId: mockOrgId,
        })
      );
    });

    it('Given: pagination params When: getting user activity Then: should pass pagination', async () => {
      // Arrange
      const activityResponse = {
        success: true,
        data: [],
        pagination: { page: 2, limit: 20, total: 0, totalPages: 0 },
        message: 'User activity retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetUserActivityUseCase.execute.mockResolvedValue(ok(activityResponse));

      // Act
      await controller.getUserActivity('user-123', 2, 20, mockOrgId);

      // Assert
      expect(mockGetUserActivityUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          page: 2,
          limit: 20,
        })
      );
    });
  });

  describe('getEntityHistory', () => {
    it('Given: valid entity params When: getting history Then: should return entity history', async () => {
      // Arrange
      const historyResponse = {
        success: true,
        data: [
          { ...mockAuditLogData, action: 'CREATE' },
          { ...mockAuditLogData, id: 'audit-456', action: 'UPDATE' },
        ],
        pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
        message: 'Entity history retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetEntityHistoryUseCase.execute.mockResolvedValue(ok(historyResponse));

      // Act
      const result = await controller.getEntityHistory(
        'Product',
        'prod-123',
        undefined,
        undefined,
        mockOrgId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockGetEntityHistoryUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Product',
          entityId: 'prod-123',
          orgId: mockOrgId,
        })
      );
    });

    it('Given: pagination params When: getting entity history Then: should pass pagination', async () => {
      // Arrange
      const historyResponse = {
        success: true,
        data: [],
        pagination: { page: 3, limit: 10, total: 0, totalPages: 0 },
        message: 'Entity history retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetEntityHistoryUseCase.execute.mockResolvedValue(ok(historyResponse));

      // Act
      await controller.getEntityHistory('User', 'user-123', 3, 10, mockOrgId);

      // Assert
      expect(mockGetEntityHistoryUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'User',
          entityId: 'user-123',
          page: 3,
          limit: 10,
        })
      );
    });

    it('Given: use case error When: getting entity history Then: should throw', async () => {
      // Arrange
      mockGetEntityHistoryUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve entity history'))
      );

      // Act & Assert
      await expect(
        controller.getEntityHistory('Product', 'prod-123', undefined, undefined, mockOrgId)
      ).rejects.toThrow();
    });

    it('Given: no orgId When: getting entity history Then: should default orgId to empty string', async () => {
      // Arrange
      const historyResponse = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        message: 'Entity history retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetEntityHistoryUseCase.execute.mockResolvedValue(ok(historyResponse));

      // Act
      await controller.getEntityHistory('Product', 'prod-123', undefined, undefined, undefined);

      // Assert
      expect(mockGetEntityHistoryUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: '',
        })
      );
    });
  });

  describe('getAuditLogs - date branch coverage', () => {
    it('Given: no dates When: getting audit logs Then: startDate and endDate should be undefined', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const logsResponse = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        message: 'Audit logs retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetAuditLogsUseCase.execute.mockResolvedValue(ok(logsResponse));

      // Act
      await controller.getAuditLogs(query as any, mockOrgId);

      // Assert
      expect(mockGetAuditLogsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: undefined,
          endDate: undefined,
        })
      );
    });

    it('Given: only startDate When: getting audit logs Then: endDate should be undefined', async () => {
      // Arrange
      const query = { page: 1, limit: 10, startDate: '2026-01-01' };
      const logsResponse = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        message: 'Audit logs retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetAuditLogsUseCase.execute.mockResolvedValue(ok(logsResponse));

      // Act
      await controller.getAuditLogs(query as any, mockOrgId);

      // Assert
      const callArgs = mockGetAuditLogsUseCase.execute.mock.calls[0][0];
      expect(callArgs.startDate).toBeInstanceOf(Date);
      expect(callArgs.endDate).toBeUndefined();
    });

    it('Given: entityId filter When: getting audit logs Then: should pass entityId to use case', async () => {
      // Arrange
      const query = { page: 1, limit: 10, entityId: 'entity-456' };
      const logsResponse = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        message: 'Audit logs retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetAuditLogsUseCase.execute.mockResolvedValue(ok(logsResponse));

      // Act
      await controller.getAuditLogs(query as any, mockOrgId);

      // Assert
      expect(mockGetAuditLogsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'entity-456',
        })
      );
    });
  });

  describe('getUserActivity - branch coverage', () => {
    it('Given: no orgId When: getting user activity Then: should default orgId to empty string', async () => {
      // Arrange
      const activityResponse = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        message: 'User activity retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetUserActivityUseCase.execute.mockResolvedValue(ok(activityResponse));

      // Act
      await controller.getUserActivity('user-123', undefined, undefined, undefined);

      // Assert
      expect(mockGetUserActivityUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          orgId: '',
          page: undefined,
          limit: undefined,
        })
      );
    });

    it('Given: use case error When: getting user activity Then: should throw', async () => {
      // Arrange
      mockGetUserActivityUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve user activity'))
      );

      // Act & Assert
      await expect(
        controller.getUserActivity('user-123', undefined, undefined, mockOrgId)
      ).rejects.toThrow();
    });

    it('Given: use case rejects When: getting user activity Then: should propagate error', async () => {
      // Arrange
      mockGetUserActivityUseCase.execute.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        controller.getUserActivity('user-123', undefined, undefined, mockOrgId)
      ).rejects.toThrow('Database error');
    });
  });
});
