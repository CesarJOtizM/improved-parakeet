import { ValueObject } from '@shared/domain/base/valueObject.base';

export type AuditActionValue =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ASSIGN_ROLE'
  | 'REMOVE_ROLE'
  | 'STATUS_CHANGED'
  | 'PERMISSION_CHANGED'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_RESET'
  | 'HTTP_REQUEST'
  | 'SYSTEM_ACTION';

export interface IAuditActionProps {
  value: AuditActionValue;
}

export class AuditAction extends ValueObject<IAuditActionProps> {
  private constructor(props: IAuditActionProps) {
    super(props);
    this.validate(props);
  }

  public static create(value: AuditActionValue): AuditAction {
    return new AuditAction({ value });
  }

  private validate(props: IAuditActionProps): void {
    const validActions: AuditActionValue[] = [
      'CREATE',
      'UPDATE',
      'DELETE',
      'ASSIGN_ROLE',
      'REMOVE_ROLE',
      'STATUS_CHANGED',
      'PERMISSION_CHANGED',
      'LOGIN',
      'LOGOUT',
      'PASSWORD_RESET',
      'HTTP_REQUEST',
      'SYSTEM_ACTION',
    ];

    if (!validActions.includes(props.value)) {
      throw new Error(`Invalid audit action: ${props.value}`);
    }
  }

  public getValue(): AuditActionValue {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }

  public equals(other?: AuditAction): boolean {
    if (!other) {
      return false;
    }
    return this.props.value === other.props.value;
  }

  public isCreate(): boolean {
    return this.props.value === 'CREATE';
  }

  public isUpdate(): boolean {
    return this.props.value === 'UPDATE';
  }

  public isDelete(): boolean {
    return this.props.value === 'DELETE';
  }
}
