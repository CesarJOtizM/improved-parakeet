import { v4 as uuidv4 } from 'uuid';

export abstract class Entity<T> {
  protected readonly _id: string;
  protected readonly _orgId: string;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;
  protected readonly props: T;

  constructor(props: T, id?: string, orgId?: string) {
    this._id = id || uuidv4();
    this._orgId = orgId || '';
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  get orgId(): string {
    return this._orgId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  public equals(entity?: Entity<T>): boolean {
    if (entity === null || entity === undefined) {
      return false;
    }

    if (this === entity) {
      return true;
    }

    return this._id === entity._id && this._orgId === entity._orgId;
  }

  protected updateTimestamp(): void {
    this._updatedAt = new Date();
  }
}
