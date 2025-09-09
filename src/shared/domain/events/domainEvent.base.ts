export abstract class DomainEvent {
  private _isMarkedForDispatch = false;

  get isMarkedForDispatch(): boolean {
    return this._isMarkedForDispatch;
  }

  public markForDispatch(): void {
    this._isMarkedForDispatch = true;
  }

  abstract get eventName(): string;
  abstract get occurredOn(): Date;
}
