import { UserStatus } from '@auth/domain';
import { UserCreatedEvent } from '@auth/domain/events/userCreated.event';
import { UserStatusChangedEvent } from '@auth/domain/events/userStatusChanged.event';
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
  phone?: string;
  timezone?: string;
  language?: string;
  jobTitle?: string;
  department?: string;
  roles?: string[];
  permissions?: string[];
}

export class User extends AggregateRoot<IUserProps> {
  private constructor(props: IUserProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(
    props: Omit<IUserProps, 'passwordHash'> & { password: string; isPasswordHashed?: boolean },
    orgId: string
  ): User {
    // If password is already hashed, use createHashed; otherwise validate and create
    const passwordHash = props.isPasswordHashed
      ? Password.createHashed(props.password)
      : Password.create(props.password);
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
    if (props.phone !== undefined) this.props.phone = props.phone;
    if (props.timezone !== undefined) this.props.timezone = props.timezone;
    if (props.language !== undefined) this.props.language = props.language;
    if (props.jobTitle !== undefined) this.props.jobTitle = props.jobTitle;
    if (props.department !== undefined) this.props.department = props.department;

    this.updateTimestamp();
  }

  public changePassword(password: string): void {
    this.props.passwordHash = Password.create(password);
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = undefined;
    this.updateTimestamp();
  }

  public activate(changedBy?: string, reason?: string): void {
    const oldStatus = this.props.status.getValue();
    this.props.status = UserStatus.create('ACTIVE');
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = undefined;
    this.updateTimestamp();

    if (changedBy) {
      this.addDomainEvent(
        new UserStatusChangedEvent(this.id, oldStatus, 'ACTIVE', changedBy, this.orgId, reason)
      );
    }
  }

  public deactivate(changedBy?: string, reason?: string): void {
    const oldStatus = this.props.status.getValue();
    this.props.status = UserStatus.create('INACTIVE');
    this.updateTimestamp();

    if (changedBy) {
      this.addDomainEvent(
        new UserStatusChangedEvent(this.id, oldStatus, 'INACTIVE', changedBy, this.orgId, reason)
      );
    }
  }

  public lock(lockDurationMinutes: number = 30, changedBy?: string, reason?: string): void {
    const oldStatus = this.props.status.getValue();
    this.props.status = UserStatus.create('LOCKED');
    this.props.lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
    this.updateTimestamp();

    if (changedBy) {
      this.addDomainEvent(
        new UserStatusChangedEvent(this.id, oldStatus, 'LOCKED', changedBy, this.orgId, reason)
      );
    }
  }

  public unlock(changedBy?: string, reason?: string): void {
    const oldStatus = this.props.status.getValue();
    this.props.status = UserStatus.create('ACTIVE');
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = undefined;
    this.updateTimestamp();

    if (changedBy) {
      this.addDomainEvent(
        new UserStatusChangedEvent(this.id, oldStatus, 'ACTIVE', changedBy, this.orgId, reason)
      );
    }
  }

  public changeStatus(
    newStatus: 'ACTIVE' | 'INACTIVE' | 'LOCKED',
    changedBy: string,
    reason?: string,
    lockDurationMinutes?: number
  ): void {
    if (newStatus === 'ACTIVE') {
      this.activate(changedBy, reason);
    } else if (newStatus === 'INACTIVE') {
      this.deactivate(changedBy, reason);
    } else if (newStatus === 'LOCKED') {
      this.lock(lockDurationMinutes || 30, changedBy, reason);
    }
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

  get phone(): string | undefined {
    return this.props.phone;
  }

  get timezone(): string | undefined {
    return this.props.timezone;
  }

  get language(): string | undefined {
    return this.props.language;
  }

  get jobTitle(): string | undefined {
    return this.props.jobTitle;
  }

  get department(): string | undefined {
    return this.props.department;
  }

  get roles(): string[] {
    return this.props.roles || [];
  }

  get permissions(): string[] {
    return this.props.permissions || [];
  }
}
