/* eslint-disable @typescript-eslint/no-explicit-any */
import { TransferInitiatedAuditHandler } from '@application/eventHandlers/transferInitiatedAuditHandler';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TransferInitiatedEvent } from '@transfer/domain/events/transferInitiated.event';

describe('TransferInitiatedAuditHandler', () => {
  let handler: TransferInitiatedAuditHandler;
  let loggerSpy: ReturnType<typeof jest.spyOn>;
  let mockAuditRepository: any;

  const createMockTransfer = (overrides: Partial<any> = {}): any => ({
    id: 'transfer-123',
    orgId: 'org-123',
    fromWarehouseId: 'warehouse-from-1',
    toWarehouseId: 'warehouse-to-1',
    getTotalQuantity: () => 15,
    getLines: () => [{}, {}],
    ...overrides,
  });

  beforeEach(() => {
    mockAuditRepository = {
      save: jest.fn(),
    } as any;
    mockAuditRepository.save.mockResolvedValue(undefined);
    handler = new TransferInitiatedAuditHandler(mockAuditRepository);
    loggerSpy = jest.spyOn((handler as any).logger, 'log');
    jest.spyOn((handler as any).logger, 'error');
  });

  describe('handle', () => {
    it('Given: TransferInitiated event When: handling event Then: should log audit information', async () => {
      // Arrange
      const mockTransfer = createMockTransfer();
      const event = new TransferInitiatedEvent(mockTransfer);

      // Act
      await handler.handle(event);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Handling TransferInitiated audit event', {
        transferId: 'transfer-123',
        fromWarehouseId: 'warehouse-from-1',
        toWarehouseId: 'warehouse-to-1',
        orgId: 'org-123',
      });

      expect(loggerSpy).toHaveBeenCalledWith('Transfer initiated audit logged successfully', {
        transferId: 'transfer-123',
      });
    });

    it('Given: error occurs When: handling event Then: should log error without throwing', async () => {
      // Arrange
      const mockTransfer = createMockTransfer();
      const event = new TransferInitiatedEvent(mockTransfer);

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
      expect(errorLoggerSpy).toHaveBeenCalledWith('Error handling TransferInitiated audit event', {
        error: 'Logging error',
        transferId: 'transfer-123',
      });

      errorSpy.mockRestore();
    });
  });
});
