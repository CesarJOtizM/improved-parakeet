import { Entity } from '@shared/domain/base/entity.base';

export interface IIntegrationSyncLogProps {
  connectionId: string;
  externalOrderId: string;
  externalOrderStatus?: string;
  action: string;
  saleId?: string;
  saleNumber?: string;
  contactId?: string;
  contactName?: string;
  errorMessage?: string;
  rawPayload?: Record<string, unknown>;
  processedAt: Date;
}

export class IntegrationSyncLog extends Entity<IIntegrationSyncLogProps> {
  private constructor(props: IIntegrationSyncLogProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(
    props: Omit<IIntegrationSyncLogProps, 'processedAt'> & { processedAt?: Date },
    orgId: string
  ): IntegrationSyncLog {
    return new IntegrationSyncLog(
      { ...props, processedAt: props.processedAt ?? new Date() },
      undefined,
      orgId
    );
  }

  public static reconstitute(
    props: IIntegrationSyncLogProps,
    id: string,
    orgId: string
  ): IntegrationSyncLog {
    return new IntegrationSyncLog(props, id, orgId);
  }

  public markSuccess(
    saleId: string,
    contactId?: string,
    saleNumber?: string,
    externalOrderStatus?: string,
    contactName?: string
  ): void {
    this.props.action = 'SYNCED';
    this.props.saleId = saleId;
    this.props.saleNumber = saleNumber;
    this.props.contactId = contactId;
    this.props.contactName = contactName;
    this.props.errorMessage = undefined;
    if (externalOrderStatus !== undefined) this.props.externalOrderStatus = externalOrderStatus;
    this.updateTimestamp();
  }

  public markFailed(errorMessage: string): void {
    this.props.action = 'FAILED';
    this.props.errorMessage = errorMessage;
    this.updateTimestamp();
  }

  get connectionId(): string {
    return this.props.connectionId;
  }
  get externalOrderId(): string {
    return this.props.externalOrderId;
  }
  get externalOrderStatus(): string | undefined {
    return this.props.externalOrderStatus;
  }
  get action(): string {
    return this.props.action;
  }
  get saleId(): string | undefined {
    return this.props.saleId;
  }
  get saleNumber(): string | undefined {
    return this.props.saleNumber;
  }
  get contactId(): string | undefined {
    return this.props.contactId;
  }
  get contactName(): string | undefined {
    return this.props.contactName;
  }
  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }
  get rawPayload(): Record<string, unknown> | undefined {
    return this.props.rawPayload;
  }
  get processedAt(): Date {
    return this.props.processedAt;
  }
}
