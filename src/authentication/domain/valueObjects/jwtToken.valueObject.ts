import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IJwtTokenProps {
  value: string;
  type: 'ACCESS' | 'REFRESH';
  expiresAt: Date;
}

export class JwtToken extends ValueObject<IJwtTokenProps> {
  private constructor(props: IJwtTokenProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string, type: 'ACCESS' | 'REFRESH', expiresAt: Date): JwtToken {
    return new JwtToken({ value, type, expiresAt });
  }

  public static createAccessToken(value: string, expiresInMinutes: number): JwtToken {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    return new JwtToken({ value, type: 'ACCESS', expiresAt });
  }

  public static createRefreshToken(value: string, expiresInDays: number): JwtToken {
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    return new JwtToken({ value, type: 'REFRESH', expiresAt });
  }

  private validate(props: IJwtTokenProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('JWT token cannot be empty');
    }

    if (!props.type || !['ACCESS', 'REFRESH'].includes(props.type)) {
      throw new Error('Invalid JWT token type');
    }

    if (!props.expiresAt || props.expiresAt <= new Date()) {
      throw new Error('JWT token must have a future expiration date');
    }

    // Validar formato básico de JWT (3 partes separadas por puntos)
    const parts = props.value.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // Verificar que ninguna parte esté vacía
    if (parts.some(part => part.trim().length === 0)) {
      throw new Error('Invalid JWT format');
    }

    // Verificar que las partes tengan contenido válido (no solo puntos)
    if (parts.some(part => part === '' || part === '.')) {
      throw new Error('Invalid JWT format');
    }
  }

  public isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  public isValid(): boolean {
    return !this.isExpired();
  }

  public isAccessToken(): boolean {
    return this.props.type === 'ACCESS';
  }

  public isRefreshToken(): boolean {
    return this.props.type === 'REFRESH';
  }

  public getExpirationTime(): Date {
    return this.props.expiresAt;
  }

  public getTimeUntilExpiration(): number {
    return this.props.expiresAt.getTime() - Date.now();
  }

  public getValue(): string {
    return this.props.value;
  }

  public getType(): 'ACCESS' | 'REFRESH' {
    return this.props.type;
  }

  public toString(): string {
    return this.props.value;
  }
}
