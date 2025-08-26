export const HTTP_STATUS_MESSAGES = {
  // Successful responses
  SUCCESS: {
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    RETRIEVED: 'Data retrieved successfully',
    OPERATION_COMPLETED: 'Operation completed successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PASSWORD_CHANGED: 'Password changed successfully',
    EMAIL_SENT: 'Email sent successfully',
    VALIDATION_SUCCESS: 'Validation successful',
  },

  // Validation errors
  VALIDATION: {
    INVALID_INPUT: 'Invalid input data',
    MISSING_REQUIRED_FIELDS: 'Missing required fields',
    INVALID_FORMAT: 'Invalid format',
    DUPLICATE_ENTRY: 'Duplicate entry',
    INVALID_CREDENTIALS: 'Invalid credentials',
    INVALID_TOKEN: 'Invalid or expired token',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  },

  // Business errors
  BUSINESS: {
    RESOURCE_NOT_FOUND: 'Resource not found',
    RESOURCE_ALREADY_EXISTS: 'Resource already exists',
    OPERATION_NOT_ALLOWED: 'Operation not allowed',
    INSUFFICIENT_BALANCE: 'Insufficient balance',
    ACCOUNT_LOCKED: 'Account locked',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  },

  // System errors
  SYSTEM: {
    INTERNAL_ERROR: 'Internal server error',
    SERVICE_UNAVAILABLE: 'Service unavailable',
    DATABASE_ERROR: 'Database error',
    EXTERNAL_SERVICE_ERROR: 'External service error',
    TIMEOUT_ERROR: 'Request timeout',
  },
} as const;

export const getHttpStatusMessage = (
  category: keyof typeof HTTP_STATUS_MESSAGES,
  key: string
): string => {
  const categoryMessages = HTTP_STATUS_MESSAGES[category];
  return (categoryMessages as Record<string, string>)[key] || 'Message not found';
};
