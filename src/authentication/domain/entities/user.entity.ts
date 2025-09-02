import { UserStatus } from '@auth/domain';
import { UserCreatedEvent } from '@auth/domain/events/userCreated.event';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { Password } from '@auth/domain/valueObjects/password.valueObject';
import { AggregateRoot } from '@shared/domain/base/aggregateRoot.base';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

export interface IUserProps {
  email: Email;
  username: string;
  passwordHash: Password;
  firstName: string;
  lastName: string;
  status: UserStatus;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  roles?: string[];
  permissions?: string[];
}

export class User extends AggregateRoot<IUserProps> {
  private constructor(props: IUserProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(
    props: Omit<IUserProps, 'passwordHash'> & { password: string },
    orgId: string
  ): User {
    const passwordHash = Password.create(props.password);
    const userProps: IUserProps = {
      ...props,
      passwordHash,
      failedLoginAttempts: props.failedLoginAttempts || 0,
    };

    const user = new User(userProps, undefined, orgId);
    user.addDomainEvent(new UserCreatedEvent(user));
    return user;
  }

  public static reconstitute(props: IUserProps, id: string, orgId: string): User {
    return new User(props, id, orgId);
  }

  public update(
    props: Partial<Omit<IUserProps, 'email' | 'passwordHash'>> & { email?: string }
  ): void {
    if (props.email !== undefined) this.props.email = Email.create(props.email);
    if (props.firstName !== undefined) this.props.firstName = props.firstName;
    if (props.lastName !== undefined) this.props.lastName = props.lastName;
    if (props.username !== undefined) this.props.username = props.username;

    this.updateTimestamp();
  }

  public changePassword(password: string): void {
    this.props.passwordHash = Password.create(password);
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

  public addDomainEventFromService(event: DomainEvent): void {
    this.addDomainEvent(event);
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
    return this.props.email.getValue();
  }

  get username(): string {
    return this.props.username;
  }

  get passwordHash(): string {
    return this.props.passwordHash.getValue();
  }

  get name(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
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

  get roles(): string[] {
    return this.props.roles || [];
  }

  get permissions(): string[] {
    return this.props.permissions || [];
  }
}
