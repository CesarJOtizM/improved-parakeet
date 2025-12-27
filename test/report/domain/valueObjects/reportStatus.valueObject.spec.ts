// ReportStatus Value Object Tests
// Unit tests for ReportStatus following AAA and Given-When-Then pattern

import { REPORT_STATUSES, ReportStatus } from '@report/domain/valueObjects';

describe('ReportStatus Value Object', () => {
  describe('create', () => {
    it('Given: valid status When: creating ReportStatus Then: should create instance', () => {
      // Arrange
      const value = REPORT_STATUSES.PENDING;

      // Act
      const status = ReportStatus.create(value);

      // Assert
      expect(status).toBeDefined();
      expect(status.getValue()).toBe(value);
    });

    it('Given: empty string When: creating ReportStatus Then: should throw error', () => {
      // Arrange
      const value = '';

      // Act & Assert
      expect(() => ReportStatus.create(value)).toThrow('Report status cannot be empty');
    });

    it('Given: invalid status When: creating ReportStatus Then: should throw error', () => {
      // Arrange
      const value = 'INVALID_STATUS';

      // Act & Assert
      expect(() => ReportStatus.create(value)).toThrow('Invalid report status');
    });
  });

  describe('static factory methods', () => {
    it('Given: calling pending() When: creating status Then: should return PENDING status', () => {
      // Act
      const status = ReportStatus.pending();

      // Assert
      expect(status.getValue()).toBe(REPORT_STATUSES.PENDING);
    });

    it('Given: calling generating() When: creating status Then: should return GENERATING status', () => {
      // Act
      const status = ReportStatus.generating();

      // Assert
      expect(status.getValue()).toBe(REPORT_STATUSES.GENERATING);
    });

    it('Given: calling completed() When: creating status Then: should return COMPLETED status', () => {
      // Act
      const status = ReportStatus.completed();

      // Assert
      expect(status.getValue()).toBe(REPORT_STATUSES.COMPLETED);
    });

    it('Given: calling failed() When: creating status Then: should return FAILED status', () => {
      // Act
      const status = ReportStatus.failed();

      // Assert
      expect(status.getValue()).toBe(REPORT_STATUSES.FAILED);
    });

    it('Given: calling exported() When: creating status Then: should return EXPORTED status', () => {
      // Act
      const status = ReportStatus.exported();

      // Assert
      expect(status.getValue()).toBe(REPORT_STATUSES.EXPORTED);
    });
  });

  describe('canTransitionTo', () => {
    it('Given: PENDING status When: transitioning to GENERATING Then: should be allowed', () => {
      // Arrange
      const status = ReportStatus.pending();

      // Act
      const canTransition = status.canTransitionTo(ReportStatus.generating());

      // Assert
      expect(canTransition).toBe(true);
    });

    it('Given: PENDING status When: transitioning to FAILED Then: should be allowed', () => {
      // Arrange
      const status = ReportStatus.pending();

      // Act
      const canTransition = status.canTransitionTo(ReportStatus.failed());

      // Assert
      expect(canTransition).toBe(true);
    });

    it('Given: GENERATING status When: transitioning to COMPLETED Then: should be allowed', () => {
      // Arrange
      const status = ReportStatus.generating();

      // Act
      const canTransition = status.canTransitionTo(ReportStatus.completed());

      // Assert
      expect(canTransition).toBe(true);
    });

    it('Given: GENERATING status When: transitioning to FAILED Then: should be allowed', () => {
      // Arrange
      const status = ReportStatus.generating();

      // Act
      const canTransition = status.canTransitionTo(ReportStatus.failed());

      // Assert
      expect(canTransition).toBe(true);
    });

    it('Given: COMPLETED status When: transitioning to EXPORTED Then: should be allowed', () => {
      // Arrange
      const status = ReportStatus.completed();

      // Act
      const canTransition = status.canTransitionTo(ReportStatus.exported());

      // Assert
      expect(canTransition).toBe(true);
    });

    it('Given: FAILED status When: transitioning to any status Then: should not be allowed', () => {
      // Arrange
      const status = ReportStatus.failed();

      // Act & Assert
      expect(status.canTransitionTo(ReportStatus.pending())).toBe(false);
      expect(status.canTransitionTo(ReportStatus.generating())).toBe(false);
      expect(status.canTransitionTo(ReportStatus.completed())).toBe(false);
      expect(status.canTransitionTo(ReportStatus.exported())).toBe(false);
    });

    it('Given: EXPORTED status When: transitioning to any status Then: should not be allowed', () => {
      // Arrange
      const status = ReportStatus.exported();

      // Act & Assert
      expect(status.canTransitionTo(ReportStatus.pending())).toBe(false);
      expect(status.canTransitionTo(ReportStatus.generating())).toBe(false);
      expect(status.canTransitionTo(ReportStatus.completed())).toBe(false);
      expect(status.canTransitionTo(ReportStatus.failed())).toBe(false);
    });
  });

  describe('status check methods', () => {
    it('Given: PENDING status When: checking isPending Then: should return true', () => {
      // Arrange
      const status = ReportStatus.pending();

      // Act & Assert
      expect(status.isPending()).toBe(true);
      expect(status.isGenerating()).toBe(false);
      expect(status.isCompleted()).toBe(false);
      expect(status.isFailed()).toBe(false);
      expect(status.isExported()).toBe(false);
    });

    it('Given: COMPLETED status When: checking isCompleted Then: should return true', () => {
      // Arrange
      const status = ReportStatus.completed();

      // Act & Assert
      expect(status.isCompleted()).toBe(true);
      expect(status.isPending()).toBe(false);
    });

    it('Given: FAILED status When: checking isFinal Then: should return true', () => {
      // Arrange
      const status = ReportStatus.failed();

      // Act
      const result = status.isFinal();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: EXPORTED status When: checking isFinal Then: should return true', () => {
      // Arrange
      const status = ReportStatus.exported();

      // Act
      const result = status.isFinal();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: PENDING status When: checking isFinal Then: should return false', () => {
      // Arrange
      const status = ReportStatus.pending();

      // Act
      const result = status.isFinal();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('equals', () => {
    it('Given: two statuses with same value When: comparing Then: should be equal', () => {
      // Arrange
      const status1 = ReportStatus.completed();
      const status2 = ReportStatus.completed();

      // Act
      const result = status1.equals(status2);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: two statuses with different values When: comparing Then: should not be equal', () => {
      // Arrange
      const status1 = ReportStatus.pending();
      const status2 = ReportStatus.completed();

      // Act
      const result = status1.equals(status2);

      // Assert
      expect(result).toBe(false);
    });
  });
});
