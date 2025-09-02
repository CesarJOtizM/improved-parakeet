import { ValueObject } from '@shared/domain/base/valueObject.base';

export interface IEmailProps {
  value: string;
}

export class Email extends ValueObject<IEmailProps> {
  private constructor(props: IEmailProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: string): Email {
    return new Email({ value: value.toLowerCase().trim() });
  }

  private validate(props: IEmailProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Email cannot be empty');
    }

    // Expresión regular más estricta que evita puntos consecutivos y otros problemas
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(props.value)) {
      throw new Error('Invalid email format');
    }

    // Validación adicional para evitar puntos consecutivos
    if (props.value.includes('..')) {
      throw new Error('Invalid email format');
    }

    // Validación para evitar dominios que empiecen o terminen con punto
    const parts = props.value.split('@');
    if (parts.length !== 2) {
      throw new Error('Invalid email format');
    }

    const domain = parts[1];
    if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
      throw new Error('Invalid email format');
    }

    if (props.value.length > 254) {
      throw new Error('Email too long');
    }
  }

  public getDomain(): string {
    return this.props.value.split('@')[1];
  }

  public getLocalPart(): string {
    return this.props.value.split('@')[0];
  }

  public isCorporateEmail(): boolean {
    const corporateDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    return !corporateDomains.includes(this.getDomain());
  }

  public getValue(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }
}
