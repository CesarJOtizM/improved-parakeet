import { Entity } from '@shared/domain/base/entity.base';

export interface IIntegrationSyncLogProps {
  connectionId: string;
  externalOrderId: string;
  action: string;
  saleId?: string;
  contactId?: string;
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

  public markSuccess(saleId: string, contactId?: string): void {
    this.props.action = 'SYNCED';
    this.props.saleId = saleId;
    this.props.contactId = contactId;
    this.props.errorMessage = undefined;
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
  get action(): string {
    return this.props.action;
  }
  get saleId(): string | undefined {
    return this.props.saleId;
  }
  get contactId(): string | undefined {
    return this.props.contactId;
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
