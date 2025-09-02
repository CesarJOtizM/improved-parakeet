import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('Email', () => {
  describe('create', () => {
    it('Given: valid email When: creating email Then: should create email instance', () => {
      // Arrange
      const validEmail = 'test@example.com';

      // Act
      const email = Email.create(validEmail);

      // Assert
      expect(email).toBeInstanceOf(Email);
      expect(email.getValue()).toBe('test@example.com');
    });

    it('Given: email with uppercase letters When: creating email Then: should convert to lowercase', () => {
      // Arrange
      const emailWithUppercase = 'TEST@EXAMPLE.COM';

      // Act
      const email = Email.create(emailWithUppercase);

      // Assert
      expect(email.getValue()).toBe('test@example.com');
    });

    it('Given: email with spaces When: creating email Then: should trim spaces', () => {
      // Arrange
      const emailWithSpaces = '  test@example.com  ';

      // Act
      const email = Email.create(emailWithSpaces);

      // Assert
      expect(email.getValue()).toBe('test@example.com');
    });

    it('Given: empty email When: creating email Then: should throw error', () => {
      // Arrange
      const emptyEmail = '';

      // Act & Assert
      expect(() => Email.create(emptyEmail)).toThrow('Email cannot be empty');
    });

    it('Given: email with only spaces When: creating email Then: should throw error', () => {
      // Arrange
      const emailWithOnlySpaces = '   ';

      // Act & Assert
      expect(() => Email.create(emailWithOnlySpaces)).toThrow('Email cannot be empty');
    });

    it('Given: invalid email format When: creating email Then: should throw error', () => {
      // Arrange
      const invalidEmails = [
        'test@',
        '@example.com',
        'test.example.com',
        'test@example',
        'test@.com',
        'test@example..com',
        'test@@example.com',
        'test@example@.com',
        'test@.example.com',
        'test@example.',
      ];

      // Act & Assert
      invalidEmails.forEach(invalidEmail => {
        expect(() => Email.create(invalidEmail)).toThrow('Invalid email format');
      });
    });

    it('Given: email too long When: creating email Then: should throw error', () => {
      // Arrange
      const longEmail = 'a'.repeat(250) + '@example.com';

      // Act & Assert
      expect(() => Email.create(longEmail)).toThrow('Email too long');
    });
  });

  describe('getDomain', () => {
    it('Given: valid email When: getting domain Then: should return domain part', () => {
      // Arrange
      const email = Email.create('test@example.com');

      // Act
      const domain = email.getDomain();

      // Assert
      expect(domain).toBe('example.com');
    });

    it('Given: email with subdomain When: getting domain Then: should return full domain', () => {
      // Arrange
      const email = Email.create('test@sub.example.com');

      // Act
      const domain = email.getDomain();

      // Assert
      expect(domain).toBe('sub.example.com');
    });
  });

  describe('getLocalPart', () => {
    it('Given: valid email When: getting local part Then: should return local part', () => {
      // Arrange
      const email = Email.create('test@example.com');

      // Act
      const localPart = email.getLocalPart();

      // Assert
      expect(localPart).toBe('test');
    });

    it('Given: email with dots in local part When: getting local part Then: should return full local part', () => {
      // Arrange
      const email = Email.create('test.user@example.com');

      // Act
      const localPart = email.getLocalPart();

      // Assert
      expect(localPart).toBe('test.user');
    });
  });

  describe('isCorporateEmail', () => {
    it('Given: corporate email When: checking if corporate Then: should return true', () => {
      // Arrange
      const corporateEmails = ['test@company.com', 'user@business.org', 'admin@enterprise.net'];

      // Act & Assert
      corporateEmails.forEach(corporateEmail => {
        const email = Email.create(corporateEmail);
        expect(email.isCorporateEmail()).toBe(true);
      });
    });

    it('Given: personal email When: checking if corporate Then: should return false', () => {
      // Arrange
      const personalEmails = [
        'test@gmail.com',
        'user@yahoo.com',
        'admin@hotmail.com',
        'test@outlook.com',
      ];

      // Act & Assert
      personalEmails.forEach(personalEmail => {
        const email = Email.create(personalEmail);
        expect(email.isCorporateEmail()).toBe(false);
      });
    });
  });

  describe('getValue', () => {
    it('Given: email instance When: getting value Then: should return email string', () => {
      // Arrange
      const emailString = 'test@example.com';
      const email = Email.create(emailString);

      // Act
      const value = email.getValue();

      // Assert
      expect(value).toBe(emailString);
    });
  });

  describe('toString', () => {
    it('Given: email instance When: converting to string Then: should return email string', () => {
      // Arrange
      const emailString = 'test@example.com';
      const email = Email.create(emailString);

      // Act
      const stringValue = email.toString();

      // Assert
      expect(stringValue).toBe(emailString);
    });
  });

  describe('equals', () => {
    it('Given: two emails with same value When: comparing Then: should return true', () => {
      // Arrange
      const email1 = Email.create('test@example.com');
      const email2 = Email.create('test@example.com');

      // Act
      const areEqual = email1.equals(email2);

      // Assert
      expect(areEqual).toBe(true);
    });

    it('Given: two emails with different values When: comparing Then: should return false', () => {
      // Arrange
      const email1 = Email.create('test@example.com');
      const email2 = Email.create('different@example.com');

      // Act
      const areEqual = email1.equals(email2);

      // Assert
      expect(areEqual).toBe(false);
    });

    it('Given: email and null When: comparing Then: should return false', () => {
      // Arrange
      const email = Email.create('test@example.com');

      // Act
      const areEqual = email.equals(undefined);

      // Assert
      expect(areEqual).toBe(false);
    });
  });
});
