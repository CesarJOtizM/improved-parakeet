/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from '@jest/globals';
import { TransferWorkflowService } from '@transfer/domain/services/transferWorkflow.service';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

describe('TransferWorkflowService', () => {
  const createMockTransfer = (statusValue: string, lines: any[] = []): any => ({
    status: {
      getValue: () => statusValue,
      isDraft: () => statusValue === 'DRAFT',
      canReceive: () => ['IN_TRANSIT', 'PARTIAL'].includes(statusValue),
      canReject: () => ['IN_TRANSIT', 'PARTIAL'].includes(statusValue),
      canCancel: () => ['DRAFT', 'IN_TRANSIT'].includes(statusValue),
    },
    getLines: () => lines,
  });

  const createMockLine = (quantity: number): any => ({
    productId: 'prod-123',
    quantity: {
      isPositive: () => quantity > 0,
    },
  });

  describe('canInitiate', () => {
    it('Given: DRAFT transfer with valid lines When: checking canInitiate Then: should return true', () => {
      // Arrange
      const transfer = createMockTransfer('DRAFT', [createMockLine(10)]);

      // Act
      const result = TransferWorkflowService.canInitiate(transfer);

      // Assert
      expect(result.canProceed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: non-DRAFT transfer When: checking canInitiate Then: should return false', () => {
      // Arrange
      const transfer = createMockTransfer('IN_TRANSIT', [createMockLine(10)]);

      // Act
      const result = TransferWorkflowService.canInitiate(transfer);

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.errors).toContain('Transfer can only be initiated when status is DRAFT');
    });

    it('Given: transfer without lines When: checking canInitiate Then: should return false', () => {
      // Arrange
      const transfer = createMockTransfer('DRAFT', []);

      // Act
      const result = TransferWorkflowService.canInitiate(transfer);

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.errors).toContain('Transfer must have at least one line before initiation');
    });

    it('Given: transfer with zero quantity line When: checking canInitiate Then: should return false', () => {
      // Arrange
      const transfer = createMockTransfer('DRAFT', [createMockLine(0)]);

      // Act
      const result = TransferWorkflowService.canInitiate(transfer);

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.errors[0]).toContain('has invalid quantity');
    });
  });

  describe('canReceive', () => {
    it('Given: IN_TRANSIT transfer with lines When: checking canReceive Then: should return true', () => {
      // Arrange
      const transfer = createMockTransfer('IN_TRANSIT', [createMockLine(10)]);

      // Act
      const result = TransferWorkflowService.canReceive(transfer);

      // Assert
      expect(result.canProceed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: PARTIAL transfer with lines When: checking canReceive Then: should return true', () => {
      // Arrange
      const transfer = createMockTransfer('PARTIAL', [createMockLine(5)]);

      // Act
      const result = TransferWorkflowService.canReceive(transfer);

      // Assert
      expect(result.canProceed).toBe(true);
    });

    it('Given: DRAFT transfer When: checking canReceive Then: should return false', () => {
      // Arrange
      const transfer = createMockTransfer('DRAFT', [createMockLine(10)]);

      // Act
      const result = TransferWorkflowService.canReceive(transfer);

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.errors).toContain(
        'Transfer can only be received when status is IN_TRANSIT or PARTIAL'
      );
    });

    it('Given: transfer without lines When: checking canReceive Then: should return false', () => {
      // Arrange
      const transfer = createMockTransfer('IN_TRANSIT', []);

      // Act
      const result = TransferWorkflowService.canReceive(transfer);

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.errors).toContain('Transfer must have at least one line');
    });
  });

  describe('canReject', () => {
    it('Given: IN_TRANSIT transfer When: checking canReject Then: should return true', () => {
      // Arrange
      const transfer = createMockTransfer('IN_TRANSIT', []);

      // Act
      const result = TransferWorkflowService.canReject(transfer);

      // Assert
      expect(result.canProceed).toBe(true);
    });

    it('Given: PARTIAL transfer When: checking canReject Then: should return true', () => {
      // Arrange
      const transfer = createMockTransfer('PARTIAL', []);

      // Act
      const result = TransferWorkflowService.canReject(transfer);

      // Assert
      expect(result.canProceed).toBe(true);
    });

    it('Given: DRAFT transfer When: checking canReject Then: should return false', () => {
      // Arrange
      const transfer = createMockTransfer('DRAFT', []);

      // Act
      const result = TransferWorkflowService.canReject(transfer);

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.errors).toContain(
        'Transfer can only be rejected when status is IN_TRANSIT or PARTIAL'
      );
    });
  });

  describe('canCancel', () => {
    it('Given: DRAFT transfer When: checking canCancel Then: should return true', () => {
      // Arrange
      const transfer = createMockTransfer('DRAFT', []);

      // Act
      const result = TransferWorkflowService.canCancel(transfer);

      // Assert
      expect(result.canProceed).toBe(true);
    });

    it('Given: IN_TRANSIT transfer When: checking canCancel Then: should return true', () => {
      // Arrange
      const transfer = createMockTransfer('IN_TRANSIT', []);

      // Act
      const result = TransferWorkflowService.canCancel(transfer);

      // Assert
      expect(result.canProceed).toBe(true);
    });

    it('Given: RECEIVED transfer When: checking canCancel Then: should return false', () => {
      // Arrange
      const transfer = createMockTransfer('RECEIVED', []);

      // Act
      const result = TransferWorkflowService.canCancel(transfer);

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.errors).toContain(
        'Transfer can only be canceled when status is DRAFT or IN_TRANSIT'
      );
    });
  });

  describe('getNextValidStatuses', () => {
    it('Given: DRAFT status When: getting next valid statuses Then: should return IN_TRANSIT and CANCELED', () => {
      // Arrange
      const status = TransferStatus.create('DRAFT');

      // Act
      const result = TransferWorkflowService.getNextValidStatuses(status);

      // Assert
      expect(result).toContain('IN_TRANSIT');
      expect(result).toContain('CANCELED');
    });

    it('Given: IN_TRANSIT status When: getting next valid statuses Then: should return PARTIAL, RECEIVED, REJECTED, CANCELED', () => {
      // Arrange
      const status = TransferStatus.create('IN_TRANSIT');

      // Act
      const result = TransferWorkflowService.getNextValidStatuses(status);

      // Assert
      expect(result).toContain('PARTIAL');
      expect(result).toContain('RECEIVED');
      expect(result).toContain('REJECTED');
      expect(result).toContain('CANCELED');
    });

    it('Given: PARTIAL status When: getting next valid statuses Then: should return RECEIVED and REJECTED', () => {
      // Arrange
      const status = TransferStatus.create('PARTIAL');

      // Act
      const result = TransferWorkflowService.getNextValidStatuses(status);

      // Assert
      expect(result).toContain('RECEIVED');
      expect(result).toContain('REJECTED');
      expect(result).not.toContain('CANCELED');
    });

    it('Given: terminal status When: getting next valid statuses Then: should return empty array', () => {
      // Arrange
      const receivedStatus = TransferStatus.create('RECEIVED');
      const rejectedStatus = TransferStatus.create('REJECTED');
      const canceledStatus = TransferStatus.create('CANCELED');

      // Act & Assert
      expect(TransferWorkflowService.getNextValidStatuses(receivedStatus)).toHaveLength(0);
      expect(TransferWorkflowService.getNextValidStatuses(rejectedStatus)).toHaveLength(0);
      expect(TransferWorkflowService.getNextValidStatuses(canceledStatus)).toHaveLength(0);
    });
  });

  describe('isValidStatusTransition', () => {
    it('Given: DRAFT to IN_TRANSIT When: checking transition Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('DRAFT');

      // Act
      const result = TransferWorkflowService.isValidStatusTransition(status, 'IN_TRANSIT');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: DRAFT to RECEIVED When: checking transition Then: should return false', () => {
      // Arrange
      const status = TransferStatus.create('DRAFT');

      // Act
      const result = TransferWorkflowService.isValidStatusTransition(status, 'RECEIVED');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: IN_TRANSIT to PARTIAL When: checking transition Then: should return true', () => {
      // Arrange
      const status = TransferStatus.create('IN_TRANSIT');

      // Act
      const result = TransferWorkflowService.isValidStatusTransition(status, 'PARTIAL');

      // Assert
      expect(result).toBe(true);
    });
  });
});
