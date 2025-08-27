import { ValueObject } from '@shared/domain/base/valueObject.base';

export type UserStatusValue = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export class UserStatus extends ValueObject<UserStatusValue> {
  constructor(value: UserStatusValue) {
    super(value);
  }

  public static create(value: UserStatusValue): UserStatus {
    if (!this.isValid(value)) {
      throw new Error(`Invalid user status: ${value}`);
    }
    return new UserStatus(value);
  }

  private static isValid(value: string): value is UserStatusValue {
    return ['ACTIVE', 'INACTIVE', 'LOCKED'].includes(value);
  }

  public isActive(): boolean {
    return this.props === 'ACTIVE';
  }

  public isInactive(): boolean {
    return this.props === 'INACTIVE';
  }

  public isLocked(): boolean {
    return this.props === 'LOCKED';
  }

  public canLogin(): boolean {
    return this.props === 'ACTIVE';
  }

  public getValue(): UserStatusValue {
    return this.props;
  }
}
