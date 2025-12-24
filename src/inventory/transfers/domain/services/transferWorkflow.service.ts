import { Transfer } from '@transfer/domain/entities/transfer.entity';
import {
  TransferStatus,
  TransferStatusValue,
} from '@transfer/domain/valueObjects/transferStatus.valueObject';

export interface IWorkflowValidationResult {
  canProceed: boolean;
  errors: string[];
}

export class TransferWorkflowService {
  /**
   * Checks if transfer can be initiated
   * - Status must be DRAFT
   * - Transfer must have at least one line
   * - All lines must have positive quantities
   */
  public static canInitiate(transfer: Transfer): IWorkflowValidationResult {
    const errors: string[] = [];

    // Check status
    if (!transfer.status.isDraft()) {
      errors.push('Transfer can only be initiated when status is DRAFT');
    }

    // Check lines
    const lines = transfer.getLines();
    if (lines.length === 0) {
      errors.push('Transfer must have at least one line before initiation');
    }

    // Check all lines have positive quantities
    for (const line of lines) {
      if (!line.quantity.isPositive()) {
        errors.push(`Line for product ${line.productId} has invalid quantity`);
      }
    }

    return {
      canProceed: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if transfer can be received
   * - Status must be IN_TRANSIT or PARTIAL
   * - Transfer must have at least one line
   */
  public static canReceive(transfer: Transfer): IWorkflowValidationResult {
    const errors: string[] = [];

    // Check status
    if (!transfer.status.canReceive()) {
      errors.push('Transfer can only be received when status is IN_TRANSIT or PARTIAL');
    }

    // Check lines
    const lines = transfer.getLines();
    if (lines.length === 0) {
      errors.push('Transfer must have at least one line');
    }

    return {
      canProceed: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if transfer can be rejected
   * - Status must be IN_TRANSIT or PARTIAL
   */
  public static canReject(transfer: Transfer): IWorkflowValidationResult {
    const errors: string[] = [];

    // Check status
    if (!transfer.status.canReject()) {
      errors.push('Transfer can only be rejected when status is IN_TRANSIT or PARTIAL');
    }

    return {
      canProceed: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if transfer can be canceled
   * - Status must be DRAFT or IN_TRANSIT
   */
  public static canCancel(transfer: Transfer): IWorkflowValidationResult {
    const errors: string[] = [];

    // Check status
    if (!transfer.status.canCancel()) {
      errors.push('Transfer can only be canceled when status is DRAFT or IN_TRANSIT');
    }

    return {
      canProceed: errors.length === 0,
      errors,
    };
  }

  /**
   * Returns array of valid next statuses for current status
   */
  public static getNextValidStatuses(currentStatus: TransferStatus): TransferStatusValue[] {
    const statusValue = currentStatus.getValue();

    switch (statusValue) {
      case 'DRAFT':
        return ['IN_TRANSIT', 'CANCELED'];
      case 'IN_TRANSIT':
        return ['PARTIAL', 'RECEIVED', 'REJECTED', 'CANCELED'];
      case 'PARTIAL':
        return ['RECEIVED', 'REJECTED'];
      case 'RECEIVED':
        return [];
      case 'REJECTED':
        return [];
      case 'CANCELED':
        return [];
      default:
        return [];
    }
  }

  /**
   * Checks if a status transition is valid
   */
  public static isValidStatusTransition(
    currentStatus: TransferStatus,
    targetStatus: TransferStatusValue
  ): boolean {
    const validStatuses = this.getNextValidStatuses(currentStatus);
    return validStatuses.includes(targetStatus);
  }
}
