import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

export interface IOtpProps {
  email: string;
  code: string;
  type: 'PASSWORD_RESET' | 'ACCOUNT_ACTIVATION' | 'TWO_FACTOR';
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
  maxAttempts: number;
  ipAddress?: string;
  userAgent?: string;
}

export class Otp extends AggregateRoot<IOtpProps> {
  private constructor(props: IOtpProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(
    email: string,
    type: IOtpProps['type'],
    orgId: string,
    ipAddress?: string,
    userAgent?: string,
    expiryMinutes: number = 15
  ): Otp {
    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const otpProps: IOtpProps = {
      email,
      code,
      type,
      expiresAt,
      isUsed: false,
      attempts: 0,
      maxAttempts: 3,
      ipAddress,
      userAgent,
    };

    return new Otp(otpProps, undefined, orgId);
  }

  public static reconstitute(props: IOtpProps, id: string, orgId: string): Otp {
    return new Otp(props, id, orgId);
  }

  private static generateOtpCode(): string {
    // Generar código OTP de 6 dígitos
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  public isValid(): boolean {
    return (
      !this.props.isUsed &&
      this.props.attempts < this.props.maxAttempts &&
      new Date() < this.props.expiresAt
    );
  }

  public verify(code: string): boolean {
    if (!this.isValid()) {
      return false;
    }

    this.props.attempts += 1;

    if (this.props.code === code) {
      this.props.isUsed = true;
      this.updateTimestamp();
      return true;
    }

    this.updateTimestamp();
    return false;
  }

  public markAsUsed(): void {
    this.props.isUsed = true;
    this.updateTimestamp();
  }

  public isExpired(): boolean {
    return new Date() >= this.props.expiresAt;
  }

  public hasExceededMaxAttempts(): boolean {
    return this.props.attempts >= this.props.maxAttempts;
  }

  // Getters
  get email(): string {
    return this.props.email;
  }

  get code(): string {
    return this.props.code;
  }

  get type(): IOtpProps['type'] {
    return this.props.type;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get isUsed(): boolean {
    return this.props.isUsed;
  }

  get attempts(): number {
    return this.props.attempts;
  }

  get maxAttempts(): number {
    return this.props.maxAttempts;
  }

  get ipAddress(): string | undefined {
    return this.props.ipAddress;
  }

  get userAgent(): string | undefined {
    return this.props.userAgent;
  }
}
