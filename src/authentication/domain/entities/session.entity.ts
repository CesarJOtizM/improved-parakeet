import { Entity } from '@shared/domain/base/entity.base';

export interface ISessionProps {
  userId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export class Session extends Entity<ISessionProps> {
  private constructor(props: ISessionProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: ISessionProps, orgId: string): Session {
    return new Session(props, undefined, orgId);
  }

  public static reconstitute(props: ISessionProps, id: string, orgId: string): Session {
    return new Session(props, id, orgId);
  }

  public update(props: Partial<ISessionProps>): void {
    if (props.token !== undefined) this.props.token = props.token;
    if (props.expiresAt !== undefined) this.props.expiresAt = props.expiresAt;
    if (props.isActive !== undefined) this.props.isActive = props.isActive;
    if (props.ipAddress !== undefined) this.props.ipAddress = props.ipAddress;
    if (props.userAgent !== undefined) this.props.userAgent = props.userAgent;

    this.updateTimestamp();
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.updateTimestamp();
  }

  public extendExpiration(additionalMinutes: number): void {
    this.props.expiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);
    this.updateTimestamp();
  }

  public isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  public isValid(): boolean {
    return this.props.isActive && !this.isExpired();
  }

  public refreshToken(newToken: string): void {
    this.props.token = newToken;
    this.updateTimestamp();
  }

  // Getters
  get userId(): string {
    return this.props.userId;
  }

  get token(): string {
    return this.props.token;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get ipAddress(): string | undefined {
    return this.props.ipAddress;
  }

  get userAgent(): string | undefined {
    return this.props.userAgent;
  }
}
