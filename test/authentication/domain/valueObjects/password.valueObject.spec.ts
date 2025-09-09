import { Password } from '@auth/domain/valueObjects/password.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('Password', () => {
  describe('create', () => {
    it('Given: valid password When: creating password Then: should create password instance', () => {
      // Arrange
      const validPassword = 'SecurePass123!';

      // Act
      const password = Password.create(validPassword);

      // Assert
      expect(password).toBeInstanceOf(Password);
      expect(password.getValue()).toBe(validPassword);
      expect(password.isHashed()).toBe(false);
    });

    it('Given: password too short When: creating password Then: should throw error', () => {
      // Arrange
      const shortPassword = 'Short1!';

      // Act & Assert
      expect(() => Password.create(shortPassword)).toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('Given: password too long When: creating password Then: should throw error', () => {
      // Arrange
      const longPassword = 'a'.repeat(130) + 'A1!';

      // Act & Assert
      expect(() => Password.create(longPassword)).toThrow('Password too long');
    });

    it('Given: password without uppercase When: creating password Then: should throw error', () => {
      // Arrange
      const passwordWithoutUppercase = 'securepass123!';

      // Act & Assert
      expect(() => Password.create(passwordWithoutUppercase)).toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
    });

    it('Given: password without lowercase When: creating password Then: should throw error', () => {
      // Arrange
      const passwordWithoutLowercase = 'SECUREPASS123!';

      // Act & Assert
      expect(() => Password.create(passwordWithoutLowercase)).toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
    });

    it('Given: password without numbers When: creating password Then: should throw error', () => {
      // Arrange
      const passwordWithoutNumbers = 'SecurePass!';

      // Act & Assert
      expect(() => Password.create(passwordWithoutNumbers)).toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
    });

    it('Given: password without special characters When: creating password Then: should throw error', () => {
      // Arrange
      const passwordWithoutSpecialChars = 'SecurePass123';

      // Act & Assert
      expect(() => Password.create(passwordWithoutSpecialChars)).toThrow(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
    });

    it('Given: password with common patterns When: creating password Then: should throw error', () => {
      // Arrange
      const commonPatternPasswords = ['Password123!', '123456Abc!', 'QwertyAbc1!', 'AdminPass1!'];

      // Act & Assert
      commonPatternPasswords.forEach(commonPassword => {
        expect(() => Password.create(commonPassword)).toThrow(
          'Password contains common patterns that are not allowed'
        );
      });
    });

    it('Given: password with valid complexity When: creating password Then: should create successfully', () => {
      // Arrange
      const validPasswords = ['SecurePass123!', 'MyP@ssw0rd', 'Str0ng!Pass', 'C0mpl3x!Pass'];

      // Act & Assert
      validPasswords.forEach(validPassword => {
        const password = Password.create(validPassword);
        expect(password).toBeInstanceOf(Password);
        expect(password.getValue()).toBe(validPassword);
        expect(password.isHashed()).toBe(false);
      });
    });
  });

  describe('createHashed', () => {
    it('Given: hashed password value When: creating hashed password Then: should create password instance', () => {
      // Arrange
      const hashedValue = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK';

      // Act
      const password = Password.createHashed(hashedValue);

      // Assert
      expect(password).toBeInstanceOf(Password);
      expect(password.getValue()).toBe(hashedValue);
      expect(password.isHashed()).toBe(true);
    });

    it('Given: hashed password When: creating hashed password Then: should not validate complexity', () => {
      // Arrange
      const invalidHashedValue = 'invalid-hash';

      // Act
      const password = Password.createHashed(invalidHashedValue);

      // Assert
      expect(password).toBeInstanceOf(Password);
      expect(password.getValue()).toBe(invalidHashedValue);
      expect(password.isHashed()).toBe(true);
    });
  });

  describe('isHashed', () => {
    it('Given: plain password When: checking if hashed Then: should return false', () => {
      // Arrange
      const password = Password.create('SecurePass123!');

      // Act
      const isHashed = password.isHashed();

      // Assert
      expect(isHashed).toBe(false);
    });

    it('Given: hashed password When: checking if hashed Then: should return true', () => {
      // Arrange
      const password = Password.createHashed(
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK'
      );

      // Act
      const isHashed = password.isHashed();

      // Assert
      expect(isHashed).toBe(true);
    });
  });

  describe('getValue', () => {
    it('Given: password instance When: getting value Then: should return password string', () => {
      // Arrange
      const passwordString = 'SecurePass123!';
      const password = Password.create(passwordString);

      // Act
      const value = password.getValue();

      // Assert
      expect(value).toBe(passwordString);
    });

    it('Given: hashed password instance When: getting value Then: should return hashed string', () => {
      // Arrange
      const hashedString = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK';
      const password = Password.createHashed(hashedString);

      // Act
      const value = password.getValue();

      // Assert
      expect(value).toBe(hashedString);
    });
  });

  describe('toString', () => {
    it('Given: plain password When: converting to string Then: should return password value', () => {
      // Arrange
      const passwordString = 'SecurePass123!';
      const password = Password.create(passwordString);

      // Act
      const stringValue = password.toString();

      // Assert
      expect(stringValue).toBe(passwordString);
    });

    it('Given: hashed password When: converting to string Then: should return hidden value', () => {
      // Arrange
      const hashedString = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK';
      const password = Password.createHashed(hashedString);

      // Act
      const stringValue = password.toString();

      // Assert
      expect(stringValue).toBe('[HIDDEN]');
    });
  });

  describe('equals', () => {
    it('Given: two plain passwords with same value When: comparing Then: should return true', () => {
      // Arrange
      const password1 = Password.create('SecurePass123!');
      const password2 = Password.create('SecurePass123!');

      // Act
      const areEqual = password1.equals(password2);

      // Assert
      expect(areEqual).toBe(true);
    });

    it('Given: two plain passwords with different values When: comparing Then: should return false', () => {
      // Arrange
      const password1 = Password.create('SecurePass123!');
      const password2 = Password.create('DifferentPass123!');

      // Act
      const areEqual = password1.equals(password2);

      // Assert
      expect(areEqual).toBe(false);
    });

    it('Given: two hashed passwords with same value When: comparing Then: should return true', () => {
      // Arrange
      const hashedValue = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK';
      const password1 = Password.createHashed(hashedValue);
      const password2 = Password.createHashed(hashedValue);

      // Act
      const areEqual = password1.equals(password2);

      // Assert
      expect(areEqual).toBe(true);
    });

    it('Given: plain and hashed passwords When: comparing Then: should return false', () => {
      // Arrange
      const plainPassword = Password.create('SecurePass123!');
      const hashedPassword = Password.createHashed(
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK'
      );

      // Act
      const areEqual = plainPassword.equals(hashedPassword);

      // Assert
      expect(areEqual).toBe(false);
    });

    it('Given: password and null When: comparing Then: should return false', () => {
      // Arrange
      const password = Password.create('SecurePass123!');

      // Act
      const areEqual = password.equals(undefined);

      // Assert
      expect(areEqual).toBe(false);
    });
  });
});
