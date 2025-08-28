import { User } from '@auth/domain/entities/user.entity';
import { UserLoggedInEvent } from '@auth/domain/events/userLoggedIn.event';
import { JwtToken } from '@auth/domain/valueObjects/jwtToken.valueObject';
import { Password } from '@auth/domain/valueObjects/password.valueObject';

export interface AuthenticationResult {
  user: User;
  accessToken: JwtToken;
  refreshToken: JwtToken;
  loginTimestamp: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthenticationService {
  /**
   * Valida las credenciales de login de un usuario
   */
  public static validateLoginCredentials(
    user: User,
    password: Password,
    hashedPassword: string
  ): boolean {
    // Verificar que el usuario esté activo y no bloqueado
    if (!user.canLogin()) {
      return false;
    }

    // Verificar que la contraseña coincida
    return password.getValue() === hashedPassword;
  }

  /**
   * Procesa un login exitoso
   */
  public static processSuccessfulLogin(user: User, ipAddress?: string, userAgent?: string): void {
    user.recordSuccessfulLogin();

    // Agregar evento de dominio
    const loginEvent = new UserLoggedInEvent(user, new Date(), ipAddress, userAgent);
    user.addDomainEventFromService(loginEvent);
  }

  /**
   * Procesa un login fallido
   */
  public static processFailedLogin(user: User): void {
    user.recordFailedLogin();
  }

  /**
   * Valida si un token JWT es válido
   */
  public static validateJwtToken(token: JwtToken): boolean {
    return token.isValid();
  }

  /**
   * Crea tokens de acceso y refresh
   */
  public static createAuthTokens(
    userId: string,
    accessTokenExpiryMinutes: number = 15,
    refreshTokenExpiryDays: number = 7
  ): {
    accessToken: JwtToken;
    refreshToken: JwtToken;
  } {
    // En un caso real, aquí se generaría el JWT real
    const accessTokenValue = `access_${userId}_${Date.now()}`;
    const refreshTokenValue = `refresh_${userId}_${Date.now()}`;

    const accessToken = JwtToken.createAccessToken(accessTokenValue, accessTokenExpiryMinutes);
    const refreshToken = JwtToken.createRefreshToken(refreshTokenValue, refreshTokenExpiryDays);

    return { accessToken, refreshToken };
  }

  /**
   * Valida la complejidad de una contraseña
   */
  public static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password too long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Verifica si un usuario tiene permisos para realizar una acción
   */
  public static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Verifica si un usuario tiene al menos uno de los permisos requeridos
   */
  public static hasAnyPermission(
    userPermissions: string[],
    requiredPermissions: string[]
  ): boolean {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Verifica si un usuario tiene todos los permisos requeridos
   */
  public static hasAllPermissions(
    userPermissions: string[],
    requiredPermissions: string[]
  ): boolean {
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }
}
