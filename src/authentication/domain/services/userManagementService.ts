import { User } from '@auth/domain/entities/user.entity';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { Username } from '@auth/domain/valueObjects/username.valueObject';

export interface IUserValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface IUserCreationValidation {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface IUserUpdateValidation {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}

export class UserManagementService {
  /**
   * Validates user creation data
   */
  public static validateUserCreation(data: IUserCreationValidation): IUserValidationResult {
    const errors: string[] = [];

    // Validate email
    try {
      Email.create(data.email);
    } catch (error) {
      errors.push(`Invalid email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate username
    try {
      Username.create(data.username);
    } catch (error) {
      errors.push(`Invalid username: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate firstName
    if (!data.firstName || data.firstName.trim().length === 0) {
      errors.push('First name is required');
    } else if (data.firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters long');
    } else if (data.firstName.trim().length > 100) {
      errors.push('First name must be at most 100 characters long');
    }

    // Validate lastName
    if (!data.lastName || data.lastName.trim().length === 0) {
      errors.push('Last name is required');
    } else if (data.lastName.trim().length < 2) {
      errors.push('Last name must be at least 2 characters long');
    } else if (data.lastName.trim().length > 100) {
      errors.push('Last name must be at most 100 characters long');
    }

    // Validate password
    if (!data.password || data.password.length === 0) {
      errors.push('Password is required');
    } else if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else if (data.password.length > 128) {
      errors.push('Password must be at most 128 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates user update data
   */
  public static validateUserUpdate(data: IUserUpdateValidation): IUserValidationResult {
    const errors: string[] = [];

    // Validate email if provided
    if (data.email !== undefined) {
      try {
        Email.create(data.email);
      } catch (error) {
        errors.push(`Invalid email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Validate username if provided
    if (data.username !== undefined) {
      try {
        Username.create(data.username);
      } catch (error) {
        errors.push(
          `Invalid username: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Validate firstName if provided
    if (data.firstName !== undefined) {
      if (data.firstName.trim().length === 0) {
        errors.push('First name cannot be empty');
      } else if (data.firstName.trim().length < 2) {
        errors.push('First name must be at least 2 characters long');
      } else if (data.firstName.trim().length > 100) {
        errors.push('First name must be at most 100 characters long');
      }
    }

    // Validate lastName if provided
    if (data.lastName !== undefined) {
      if (data.lastName.trim().length === 0) {
        errors.push('Last name cannot be empty');
      } else if (data.lastName.trim().length < 2) {
        errors.push('Last name must be at least 2 characters long');
      } else if (data.lastName.trim().length > 100) {
        errors.push('Last name must be at most 100 characters long');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if a user can be deactivated
   */
  public static canUserBeDeactivated(user: User, currentUserId: string): IUserValidationResult {
    const errors: string[] = [];

    // Cannot deactivate yourself
    if (user.id === currentUserId) {
      errors.push('Cannot deactivate your own account');
    }

    // Cannot deactivate if user is already inactive
    if (user.status.getValue() === 'INACTIVE') {
      errors.push('User is already inactive');
    }

    // Cannot deactivate if user is locked (should unlock first)
    if (user.status.getValue() === 'LOCKED') {
      errors.push('Cannot deactivate locked user. Unlock first or change status to inactive');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if a user can be activated
   */
  public static canUserBeActivated(user: User): IUserValidationResult {
    const errors: string[] = [];

    // User is already active
    if (user.status.getValue() === 'ACTIVE') {
      errors.push('User is already active');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if a user can be locked
   */
  public static canUserBeLocked(user: User, currentUserId: string): IUserValidationResult {
    const errors: string[] = [];

    // Cannot lock yourself
    if (user.id === currentUserId) {
      errors.push('Cannot lock your own account');
    }

    // User is already locked
    if (user.status.getValue() === 'LOCKED' && user.isLocked()) {
      errors.push('User is already locked');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if a user can be unlocked
   */
  public static canUserBeUnlocked(user: User): IUserValidationResult {
    const errors: string[] = [];

    // User is not locked
    if (user.status.getValue() !== 'LOCKED' || !user.isLocked()) {
      errors.push('User is not locked');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates if email can be changed
   */
  public static async canChangeEmail(
    user: User,
    newEmail: string,
    emailExists: (email: string, orgId: string) => Promise<boolean>
  ): Promise<IUserValidationResult> {
    const errors: string[] = [];

    // Validate email format
    try {
      Email.create(newEmail);
    } catch (error) {
      errors.push(`Invalid email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }

    // Check if email is already in use by another user
    const exists = await emailExists(newEmail, user.orgId);
    if (exists && newEmail.toLowerCase() !== user.email.toLowerCase()) {
      errors.push('Email is already in use by another user');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates if username can be changed
   */
  public static async canChangeUsername(
    user: User,
    newUsername: string,
    usernameExists: (username: string, orgId: string) => Promise<boolean>
  ): Promise<IUserValidationResult> {
    const errors: string[] = [];

    // Validate username format
    try {
      Username.create(newUsername);
    } catch (error) {
      errors.push(`Invalid username: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }

    // Check if username is already in use by another user
    const exists = await usernameExists(newUsername, user.orgId);
    if (exists && newUsername.toLowerCase() !== user.username.toLowerCase()) {
      errors.push('Username is already in use by another user');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
