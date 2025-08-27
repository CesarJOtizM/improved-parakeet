import { UserStatus } from '@auth/domain';
import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';

export interface UserProps {
  email: string;
  username: string;
  passwordHash: string;
  name: string;
  status: UserStatus;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
}

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(props: UserProps, orgId: string): User {
    const user = new User(props, undefined, orgId);
    return user;
  }

  public static reconstitute(props: UserProps, id: string, orgId: string): User {
    return new User(props, id, orgId);
  }

  public update(props: Partial<UserProps>): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.email !== undefined) this.props.email = props.email;
    if (props.username !== undefined) this.props.username = props.username;

    this.updateTimestamp();
  }

  public changePassword(passwordHash: string): void {
    this.props.passwordHash = passwordHash;
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = undefined;
    this.updateTimestamp();
  }

  public activate(): void {
    this.props.status = UserStatus.create('ACTIVE');
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = undefined;
    this.updateTimestamp();
  }

  public deactivate(): void {
    this.props.status = UserStatus.create('INACTIVE');
    this.updateTimestamp();
  }

  public lock(lockDurationMinutes: number = 30): void {
    this.props.status = UserStatus.create('LOCKED');
    this.props.lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
    this.updateTimestamp();
  }

  public unlock(): void {
    this.props.status = UserStatus.create('ACTIVE');
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = undefined;
    this.updateTimestamp();
  }

  public recordFailedLogin(): void {
    this.props.failedLoginAttempts += 1;

    if (this.props.failedLoginAttempts >= 5) {
      this.lock();
    }

    this.updateTimestamp();
  }

  public recordSuccessfulLogin(): void {
    this.props.lastLoginAt = new Date();
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = undefined;
    this.updateTimestamp();
  }

  public isLocked(): boolean {
    if (this.props.status.getValue() !== 'LOCKED') return false;
    if (!this.props.lockedUntil) return false;
    return new Date() < this.props.lockedUntil;
  }

  public canLogin(): boolean {
    return this.props.status.canLogin() && !this.isLocked();
  }

  // Getters
  get email(): string {
    return this.props.email;
  }

  get username(): string {
    return this.props.username;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }

  get lockedUntil(): Date | undefined {
    return this.props.lockedUntil;
  }
}
