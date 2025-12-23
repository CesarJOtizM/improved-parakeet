import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';

describe('AuditAction Value Object', () => {
  describe('Given: valid audit action When: creating AuditAction Then: should create successfully', () => {
    it('should create CREATE action', () => {
      // Arrange & Act
      const action = AuditAction.create('CREATE');

      // Assert
      expect(action.getValue()).toBe('CREATE');
      expect(action.isCreate()).toBe(true);
      expect(action.isUpdate()).toBe(false);
      expect(action.isDelete()).toBe(false);
    });

    it('should create UPDATE action', () => {
      // Arrange & Act
      const action = AuditAction.create('UPDATE');

      // Assert
      expect(action.getValue()).toBe('UPDATE');
      expect(action.isUpdate()).toBe(true);
    });

    it('should create DELETE action', () => {
      // Arrange & Act
      const action = AuditAction.create('DELETE');

      // Assert
      expect(action.getValue()).toBe('DELETE');
      expect(action.isDelete()).toBe(true);
    });

    it('should create ASSIGN_ROLE action', () => {
      // Arrange & Act
      const action = AuditAction.create('ASSIGN_ROLE');

      // Assert
      expect(action.getValue()).toBe('ASSIGN_ROLE');
    });
  });

  describe('Given: invalid audit action When: creating AuditAction Then: should throw error', () => {
    it('should throw error for invalid action', () => {
      // Arrange & Act & Assert
      expect(() => AuditAction.create('INVALID_ACTION' as AuditAction['props']['value'])).toThrow(
        'Invalid audit action'
      );
    });
  });

  describe('Given: two AuditActions When: comparing Then: should compare correctly', () => {
    it('should return true for equal actions', () => {
      // Arrange
      const action1 = AuditAction.create('CREATE');
      const action2 = AuditAction.create('CREATE');

      // Act & Assert
      expect(action1.equals(action2)).toBe(true);
    });

    it('should return false for different actions', () => {
      // Arrange
      const action1 = AuditAction.create('CREATE');
      const action2 = AuditAction.create('UPDATE');

      // Act & Assert
      expect(action1.equals(action2)).toBe(false);
    });

    it('should return false when comparing with undefined', () => {
      // Arrange
      const action = AuditAction.create('CREATE');

      // Act & Assert
      expect(action.equals(undefined)).toBe(false);
    });
  });
});
