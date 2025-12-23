import { Username } from '@auth/domain/valueObjects/username.valueObject';
import { describe, expect, it } from '@jest/globals';

describe('Username Value Object', () => {
  describe('create', () => {
    it('Given: valid username When: creating username Then: should create successfully', () => {
      // Arrange & Act
      const username = Username.create('johndoe');

      // Assert
      expect(username).toBeInstanceOf(Username);
      expect(username.getValue()).toBe('johndoe');
    });

    it('Given: username with spaces When: creating username Then: should trim spaces', () => {
      // Arrange & Act
      const username = Username.create('  johndoe  ');

      // Assert
      expect(username.getValue()).toBe('johndoe');
    });

    it('Given: empty username When: creating username Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Username.create('')).toThrow('Username cannot be empty');
      expect(() => Username.create('   ')).toThrow('Username cannot be empty');
    });

    it('Given: username shorter than 3 characters When: creating username Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Username.create('ab')).toThrow('Username must be at least 3 characters long');
      expect(() => Username.create('a')).toThrow('Username must be at least 3 characters long');
    });

    it('Given: username longer than 50 characters When: creating username Then: should throw error', () => {
      // Arrange
      const longUsername = 'a'.repeat(51);

      // Act & Assert
      expect(() => Username.create(longUsername)).toThrow(
        'Username must be at most 50 characters long'
      );
    });

    it('Given: username with invalid characters When: creating username Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Username.create('john@doe')).toThrow(
        'Username can only contain letters, numbers, underscores, and hyphens'
      );
      expect(() => Username.create('john.doe')).toThrow(
        'Username can only contain letters, numbers, underscores, and hyphens'
      );
      expect(() => Username.create('john doe')).toThrow(
        'Username can only contain letters, numbers, underscores, and hyphens'
      );
    });

    it('Given: username starting with underscore When: creating username Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Username.create('_johndoe')).toThrow(
        'Username cannot start with underscore or hyphen'
      );
    });

    it('Given: username starting with hyphen When: creating username Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Username.create('-johndoe')).toThrow(
        'Username cannot start with underscore or hyphen'
      );
    });

    it('Given: username ending with underscore When: creating username Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Username.create('johndoe_')).toThrow(
        'Username cannot end with underscore or hyphen'
      );
    });

    it('Given: username ending with hyphen When: creating username Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Username.create('johndoe-')).toThrow(
        'Username cannot end with underscore or hyphen'
      );
    });

    it('Given: username with only numbers When: creating username Then: should throw error', () => {
      // Arrange & Act & Assert
      expect(() => Username.create('123456')).toThrow('Username cannot be only numbers');
    });

    it('Given: valid username with underscore When: creating username Then: should create successfully', () => {
      // Arrange & Act
      const username = Username.create('john_doe');

      // Assert
      expect(username.getValue()).toBe('john_doe');
    });

    it('Given: valid username with hyphen When: creating username Then: should create successfully', () => {
      // Arrange & Act
      const username = Username.create('john-doe');

      // Assert
      expect(username.getValue()).toBe('john-doe');
    });

    it('Given: valid username with numbers When: creating username Then: should create successfully', () => {
      // Arrange & Act
      const username = Username.create('john123');

      // Assert
      expect(username.getValue()).toBe('john123');
    });
  });

  describe('equals', () => {
    it('Given: two usernames with same value When: comparing Then: should return true', () => {
      // Arrange
      const username1 = Username.create('johndoe');
      const username2 = Username.create('johndoe');

      // Act & Assert
      expect(username1.equals(username2)).toBe(true);
    });

    it('Given: two usernames with different case When: comparing Then: should return true (case insensitive)', () => {
      // Arrange
      const username1 = Username.create('JohnDoe');
      const username2 = Username.create('johndoe');

      // Act & Assert
      expect(username1.equals(username2)).toBe(true);
    });

    it('Given: two usernames with different values When: comparing Then: should return false', () => {
      // Arrange
      const username1 = Username.create('johndoe');
      const username2 = Username.create('janedoe');

      // Act & Assert
      expect(username1.equals(username2)).toBe(false);
    });

    it('Given: username and undefined When: comparing Then: should return false', () => {
      // Arrange
      const username = Username.create('johndoe');

      // Act & Assert
      expect(username.equals(undefined)).toBe(false);
    });
  });

  describe('toString', () => {
    it('Given: username When: converting to string Then: should return value', () => {
      // Arrange
      const username = Username.create('johndoe');

      // Act & Assert
      expect(username.toString()).toBe('johndoe');
    });
  });
});
