/* eslint-disable @typescript-eslint/no-explicit-any */
import { TransferReceivedAuditHandler } from '@application/eventHandlers/transferReceivedAuditHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TransferReceivedEvent } from '@transfer/domain/events/transferReceived.event';

describe('TransferReceivedAuditHandler', () => {
  let handler: TransferReceivedAuditHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockAuditRepository: any;

  const createMockTransfer = (overrides: Partial<any> = {}): any => ({
    id: 'transfer-123',
    orgId: 'org-123',
    fromWarehouseId: 'warehouse-from-1',
    toWarehouseId: 'warehouse-to-1',
    getTotalQuantity: () => 20,
    ...overrides,
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new TransferReceivedAuditHandler(mockAuditRepository);
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: TransferReceived event When: handling event Then: should log audit information', async () => {
      // Arrange
      const mockTransfer = createMockTransfer();
      const event = new TransferReceivedEvent(mockTransfer);

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling TransferReceived audit event', {
        transferId: 'transfer-123',
        fromWarehouseId: 'warehouse-from-1',
        toWarehouseId: 'warehouse-to-1',
        orgId: 'org-123',
      });

      expect(loggerSpy).toHaveBeenCalledWith('Transfer received audit logged successfully', {
        transferId: 'transfer-123',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const mockTransfer = createMockTransfer();
      const event = new TransferReceivedEvent(mockTransfer);

      let callCount = 0;
      const errorSpy = jest.spyOn((handler as any).logger, 'log').mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Logging error');
        }
      });
      const errorLoggerSpy = jest.spyOn((handler as any).logger, 'error');

      // Act & Assert
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Assert
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling TransferReceived audit event', {
        error: 'Logging error',
        transferId: 'transfer-123',
      });

      errorSpy.mockRestore();
    });
  });
});
