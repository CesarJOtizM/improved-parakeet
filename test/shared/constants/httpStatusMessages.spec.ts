// HTTP Status Messages Tests - Mensajes de estado HTTP
// Tests unitarios para los mensajes de estado HTTP siguiendo AAA y Given-When-Then

import { HTTP_STATUS_MESSAGES, getHttpStatusMessage } from '@shared/constants/httpStatusMessages';

describe('HTTP Status Messages', () => {
  describe('HTTP_STATUS_MESSAGES', () => {
    it('Given: HTTP_STATUS_MESSAGES When: checking structure Then: should have all categories', () => {
      // Arrange & Act
      const messages = HTTP_STATUS_MESSAGES;

      // Assert
      expect(messages.SUCCESS).toBeDefined();
      expect(messages.VALIDATION).toBeDefined();
      expect(messages.BUSINESS).toBeDefined();
      expect(messages.SYSTEM).toBeDefined();
    });

    it('Given: SUCCESS messages When: checking structure Then: should have all success messages', () => {
      // Arrange & Act
      const successMessages = HTTP_STATUS_MESSAGES.SUCCESS;

      // Assert
      expect(successMessages.CREATED).toBeDefined();
      expect(successMessages.UPDATED).toBeDefined();
      expect(successMessages.DELETED).toBeDefined();
      expect(successMessages.RETRIEVED).toBeDefined();
      expect(successMessages.OPERATION_COMPLETED).toBeDefined();
      expect(successMessages.LOGIN_SUCCESS).toBeDefined();
      expect(successMessages.LOGOUT_SUCCESS).toBeDefined();
      expect(successMessages.PASSWORD_CHANGED).toBeDefined();
      expect(successMessages.EMAIL_SENT).toBeDefined();
      expect(successMessages.VALIDATION_SUCCESS).toBeDefined();
    });

    it('Given: VALIDATION messages When: checking structure Then: should have all validation messages', () => {
      // Arrange & Act
      const validationMessages = HTTP_STATUS_MESSAGES.VALIDATION;

      // Assert
      expect(validationMessages.INVALID_INPUT).toBeDefined();
      expect(validationMessages.MISSING_REQUIRED_FIELDS).toBeDefined();
      expect(validationMessages.INVALID_FORMAT).toBeDefined();
      expect(validationMessages.DUPLICATE_ENTRY).toBeDefined();
      expect(validationMessages.INVALID_CREDENTIALS).toBeDefined();
      expect(validationMessages.INVALID_TOKEN).toBeDefined();
      expect(validationMessages.INSUFFICIENT_PERMISSIONS).toBeDefined();
    });

    it('Given: BUSINESS messages When: checking structure Then: should have all business messages', () => {
      // Arrange & Act
      const businessMessages = HTTP_STATUS_MESSAGES.BUSINESS;

      // Assert
      expect(businessMessages.RESOURCE_NOT_FOUND).toBeDefined();
      expect(businessMessages.RESOURCE_ALREADY_EXISTS).toBeDefined();
      expect(businessMessages.OPERATION_NOT_ALLOWED).toBeDefined();
      expect(businessMessages.INSUFFICIENT_BALANCE).toBeDefined();
      expect(businessMessages.ACCOUNT_LOCKED).toBeDefined();
      expect(businessMessages.RATE_LIMIT_EXCEEDED).toBeDefined();
    });

    it('Given: SYSTEM messages When: checking structure Then: should have all system messages', () => {
      // Arrange & Act
      const systemMessages = HTTP_STATUS_MESSAGES.SYSTEM;

      // Assert
      expect(systemMessages.INTERNAL_ERROR).toBeDefined();
      expect(systemMessages.SERVICE_UNAVAILABLE).toBeDefined();
      expect(systemMessages.DATABASE_ERROR).toBeDefined();
      expect(systemMessages.EXTERNAL_SERVICE_ERROR).toBeDefined();
      expect(systemMessages.TIMEOUT_ERROR).toBeDefined();
    });

    it('Given: SUCCESS messages When: checking content Then: should have descriptive messages', () => {
      // Arrange & Act
      const successMessages = HTTP_STATUS_MESSAGES.SUCCESS;

      // Assert
      expect(successMessages.CREATED).toBe('Resource created successfully');
      expect(successMessages.UPDATED).toBe('Resource updated successfully');
      expect(successMessages.DELETED).toBe('Resource deleted successfully');
      expect(successMessages.RETRIEVED).toBe('Data retrieved successfully');
      expect(successMessages.OPERATION_COMPLETED).toBe('Operation completed successfully');
      expect(successMessages.LOGIN_SUCCESS).toBe('Login successful');
      expect(successMessages.LOGOUT_SUCCESS).toBe('Logout successful');
      expect(successMessages.PASSWORD_CHANGED).toBe('Password changed successfully');
      expect(successMessages.EMAIL_SENT).toBe('Email sent successfully');
      expect(successMessages.VALIDATION_SUCCESS).toBe('Validation successful');
    });

    it('Given: VALIDATION messages When: checking content Then: should have descriptive messages', () => {
      // Arrange & Act
      const validationMessages = HTTP_STATUS_MESSAGES.VALIDATION;

      // Assert
      expect(validationMessages.INVALID_INPUT).toBe('Invalid input data');
      expect(validationMessages.MISSING_REQUIRED_FIELDS).toBe('Missing required fields');
      expect(validationMessages.INVALID_FORMAT).toBe('Invalid format');
      expect(validationMessages.DUPLICATE_ENTRY).toBe('Duplicate entry');
      expect(validationMessages.INVALID_CREDENTIALS).toBe('Invalid credentials');
      expect(validationMessages.INVALID_TOKEN).toBe('Invalid or expired token');
      expect(validationMessages.INSUFFICIENT_PERMISSIONS).toBe('Insufficient permissions');
    });

    it('Given: BUSINESS messages When: checking content Then: should have descriptive messages', () => {
      // Arrange & Act
      const businessMessages = HTTP_STATUS_MESSAGES.BUSINESS;

      // Assert
      expect(businessMessages.RESOURCE_NOT_FOUND).toBe('Resource not found');
      expect(businessMessages.RESOURCE_ALREADY_EXISTS).toBe('Resource already exists');
      expect(businessMessages.OPERATION_NOT_ALLOWED).toBe('Operation not allowed');
      expect(businessMessages.INSUFFICIENT_BALANCE).toBe('Insufficient balance');
      expect(businessMessages.ACCOUNT_LOCKED).toBe('Account locked');
      expect(businessMessages.RATE_LIMIT_EXCEEDED).toBe('Rate limit exceeded');
    });

    it('Given: SYSTEM messages When: checking content Then: should have descriptive messages', () => {
      // Arrange & Act
      const systemMessages = HTTP_STATUS_MESSAGES.SYSTEM;

      // Assert
      expect(systemMessages.INTERNAL_ERROR).toBe('Internal server error');
      expect(systemMessages.SERVICE_UNAVAILABLE).toBe('Service unavailable');
      expect(systemMessages.DATABASE_ERROR).toBe('Database error');
      expect(systemMessages.EXTERNAL_SERVICE_ERROR).toBe('External service error');
      expect(systemMessages.TIMEOUT_ERROR).toBe('Request timeout');
    });

    it('Given: HTTP_STATUS_MESSAGES When: checking const assertion Then: should be readonly', () => {
      // Arrange & Act
      const messages = HTTP_STATUS_MESSAGES;

      // Assert
      expect(messages).toBeDefined();
      expect(typeof messages).toBe('object');
    });
  });

  describe('getHttpStatusMessage', () => {
    it('Given: valid category and key When: getting message Then: should return correct message', () => {
      // Arrange
      const category = 'SUCCESS';
      const key = 'CREATED';

      // Act
      const message = getHttpStatusMessage(category, key);

      // Assert
      expect(message).toBe('Resource created successfully');
    });

    it('Given: valid category and key When: getting validation message Then: should return correct message', () => {
      // Arrange
      const category = 'VALIDATION';
      const key = 'INVALID_INPUT';

      // Act
      const message = getHttpStatusMessage(category, key);

      // Assert
      expect(message).toBe('Invalid input data');
    });

    it('Given: valid category and key When: getting business message Then: should return correct message', () => {
      // Arrange
      const category = 'BUSINESS';
      const key = 'RESOURCE_NOT_FOUND';

      // Act
      const message = getHttpStatusMessage(category, key);

      // Assert
      expect(message).toBe('Resource not found');
    });

    it('Given: valid category and key When: getting system message Then: should return correct message', () => {
      // Arrange
      const category = 'SYSTEM';
      const key = 'INTERNAL_ERROR';

      // Act
      const message = getHttpStatusMessage(category, key);

      // Assert
      expect(message).toBe('Internal server error');
    });

    it('Given: invalid category When: getting message Then: should return fallback message', () => {
      // Arrange
      const category = 'INVALID_CATEGORY';
      const key = 'SOME_KEY';

      // Act
      const message = getHttpStatusMessage(category as keyof typeof HTTP_STATUS_MESSAGES, key);

      // Assert
      expect(message).toBe('Message not found');
    });

    it('Given: valid category but invalid key When: getting message Then: should return fallback message', () => {
      // Arrange
      const category = 'SUCCESS';
      const key = 'INVALID_KEY';

      // Act
      const message = getHttpStatusMessage(category, key);

      // Assert
      expect(message).toBe('Message not found');
    });

    it('Given: empty category When: getting message Then: should return fallback message', () => {
      // Arrange
      const category = '';
      const key = 'SOME_KEY';

      // Act
      const message = getHttpStatusMessage(
        category as unknown as keyof typeof HTTP_STATUS_MESSAGES,
        key
      );

      // Assert
      expect(message).toBe('Message not found');
    });

    it('Given: empty key When: getting message Then: should return fallback message', () => {
      // Arrange
      const category = 'SUCCESS';
      const key = '';

      // Act
      const message = getHttpStatusMessage(category, key);

      // Assert
      expect(message).toBe('Message not found');
    });

    it('Given: null category When: getting message Then: should return fallback message', () => {
      // Arrange
      const category = null;
      const key = 'SOME_KEY';

      // Act
      const message = getHttpStatusMessage(
        category as unknown as keyof typeof HTTP_STATUS_MESSAGES,
        key
      );

      // Assert
      expect(message).toBe('Message not found');
    });

    it('Given: null key When: getting message Then: should return fallback message', () => {
      // Arrange
      const category = 'SUCCESS';
      const key = null;

      // Act
      const message = getHttpStatusMessage(category, key as unknown as string);

      // Assert
      expect(message).toBe('Message not found');
    });

    it('Given: undefined category When: getting message Then: should return fallback message', () => {
      // Arrange
      const category = undefined;
      const key = 'SOME_KEY';

      // Act
      const message = getHttpStatusMessage(
        category as unknown as keyof typeof HTTP_STATUS_MESSAGES,
        key
      );

      // Assert
      expect(message).toBe('Message not found');
    });

    it('Given: undefined key When: getting message Then: should return fallback message', () => {
      // Arrange
      const category = 'SUCCESS';
      const key = undefined;

      // Act
      const message = getHttpStatusMessage(category, key as unknown as string);

      // Assert
      expect(message).toBe('Message not found');
    });

    it('Given: all valid combinations When: getting messages Then: should return correct messages', () => {
      // Arrange
      const testCases = [
        {
          category: 'SUCCESS' as const,
          key: 'CREATED' as const,
          expected: 'Resource created successfully',
        },
        {
          category: 'SUCCESS' as const,
          key: 'UPDATED' as const,
          expected: 'Resource updated successfully',
        },
        {
          category: 'VALIDATION' as const,
          key: 'INVALID_INPUT' as const,
          expected: 'Invalid input data',
        },
        {
          category: 'BUSINESS' as const,
          key: 'RESOURCE_NOT_FOUND' as const,
          expected: 'Resource not found',
        },
        {
          category: 'SYSTEM' as const,
          key: 'INTERNAL_ERROR' as const,
          expected: 'Internal server error',
        },
      ];

      // Act & Assert
      testCases.forEach(({ category, key, expected }) => {
        const message = getHttpStatusMessage(category, key);
        expect(message).toBe(expected);
      });
    });
  });
});
