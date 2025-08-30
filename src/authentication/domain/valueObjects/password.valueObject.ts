import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IPasswordProps {
  value: string;
  isHashed: boolean;
}

export class Password extends ValueObject<IPasswordProps> {
  private constructor(props: IPasswordProps) {
    super(props);
    if (!props.isHashed) {
      this.validate(props);
    }
  }

  public static create(value: string): Password {
    return new Password({ value, isHashed: false });
  }

  public static createHashed(hashedValue: string): Password {
    return new Password({ value: hashedValue, isHashed: true });
  }

  private validate(props: IPasswordProps): void {
    if (!props.value || props.value.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (props.value.length > 128) {
      throw new Error('Password too long');
    }

    // Validar complejidad mínima
    const hasUpperCase = /[A-Z]/.test(props.value);
    const hasLowerCase = /[a-z]/.test(props.value);
    const hasNumbers = /\d/.test(props.value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(props.value);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
    }

    // Validar que no contenga información personal común
    const commonPatterns = ['password', '123456', 'qwerty', 'admin'];
    if (commonPatterns.some(pattern => props.value.toLowerCase().includes(pattern))) {
      throw new Error('Password contains common patterns that are not allowed');
    }
  }

  public isHashed(): boolean {
    return this.props.isHashed;
  }

  public getValue(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.isHashed ? '[HIDDEN]' : this.props.value;
  }

  public equals(password: Password): boolean {
    if (this.props.isHashed !== password.props.isHashed) {
      return false;
    }
    return this.props.value === password.props.value;
  }
}
