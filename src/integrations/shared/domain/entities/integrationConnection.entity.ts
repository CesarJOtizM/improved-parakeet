import { Entity } from '@shared/domain/base/entity.base';

export interface IIntegrationConnectionProps {
  provider: string;
  accountName: string;
  storeName: string;
  status: string;
  syncStrategy: string;
  syncDirection: string;
  encryptedAppKey: string;
  encryptedAppToken: string;
  webhookSecret: string;
  defaultWarehouseId: string;
  defaultContactId?: string;
  connectedAt?: Date;
  lastSyncAt?: Date;
  lastSyncError?: string;
  companyId?: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  meliUserId?: string;
  tokenStatus?: string;
  createdBy: string;
}

export class IntegrationConnection extends Entity<IIntegrationConnectionProps> {
  private constructor(props: IIntegrationConnectionProps, id?: string, orgId?: string) {
    super(props, id, orgId);
  }

  public static create(
    props: Omit<IIntegrationConnectionProps, 'status'> & { status?: string },
    orgId: string
  ): IntegrationConnection {
    return new IntegrationConnection(
      { ...props, status: props.status ?? 'DISCONNECTED' },
      undefined,
      orgId
    );
  }

  public static reconstitute(
    props: IIntegrationConnectionProps,
    id: string,
    orgId: string
  ): IntegrationConnection {
    return new IntegrationConnection(props, id, orgId);
  }

  public connect(): void {
    this.props.status = 'CONNECTED';
    this.props.connectedAt = new Date();
    this.props.lastSyncError = undefined;
    this.updateTimestamp();
  }

  public disconnect(): void {
    this.props.status = 'DISCONNECTED';
    this.updateTimestamp();
  }

  public markError(message: string): void {
    this.props.status = 'ERROR';
    this.props.lastSyncError = message;
    this.updateTimestamp();
  }

  public updateLastSync(): void {
    this.props.lastSyncAt = new Date();
    this.props.lastSyncError = undefined;
    this.updateTimestamp();
  }

  public updateCredentials(encryptedAppKey: string, encryptedAppToken: string): void {
    this.props.encryptedAppKey = encryptedAppKey;
    this.props.encryptedAppToken = encryptedAppToken;
    this.updateTimestamp();
  }

  public update(
    props: Partial<
      Pick<
        IIntegrationConnectionProps,
        | 'storeName'
        | 'syncStrategy'
        | 'syncDirection'
        | 'defaultWarehouseId'
        | 'defaultContactId'
        | 'companyId'
      >
    >
  ): void {
    if (props.storeName !== undefined) this.props.storeName = props.storeName;
    if (props.syncStrategy !== undefined) this.props.syncStrategy = props.syncStrategy;
    if (props.syncDirection !== undefined) this.props.syncDirection = props.syncDirection;
    if (props.defaultWarehouseId !== undefined)
      this.props.defaultWarehouseId = props.defaultWarehouseId;
    if (props.defaultContactId !== undefined) this.props.defaultContactId = props.defaultContactId;
    if (props.companyId !== undefined) this.props.companyId = props.companyId;
    this.updateTimestamp();
  }

  public updateOAuthTokens(params: {
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
    meliUserId: string;
  }): void {
    this.props.encryptedAccessToken = params.encryptedAccessToken;
    this.props.encryptedRefreshToken = params.encryptedRefreshToken;
    this.props.accessTokenExpiresAt = params.accessTokenExpiresAt;
    this.props.refreshTokenExpiresAt = params.refreshTokenExpiresAt;
    this.props.meliUserId = params.meliUserId;
    this.props.tokenStatus = 'VALID';
    this.connect();
  }

  public markTokenRefreshing(): void {
    this.props.tokenStatus = 'REFRESHING';
    this.updateTimestamp();
  }

  public markReauthRequired(): void {
    this.props.tokenStatus = 'REAUTH_REQUIRED';
    this.props.status = 'ERROR';
    this.props.lastSyncError = 'MercadoLibre authentication expired. Please re-authenticate.';
    this.updateTimestamp();
  }

  public clearOAuthTokens(): void {
    this.props.encryptedAccessToken = undefined;
    this.props.encryptedRefreshToken = undefined;
    this.props.accessTokenExpiresAt = undefined;
    this.props.refreshTokenExpiresAt = undefined;
    this.props.tokenStatus = undefined;
    this.updateTimestamp();
  }

  get isAccessTokenExpired(): boolean {
    if (!this.props.accessTokenExpiresAt) return true;
    const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
    return Date.now() >= this.props.accessTokenExpiresAt.getTime() - bufferMs;
  }

  get isRefreshTokenExpired(): boolean {
    if (!this.props.refreshTokenExpiresAt) return true;
    return Date.now() >= this.props.refreshTokenExpiresAt.getTime();
  }

  get needsReauth(): boolean {
    return this.props.tokenStatus === 'REAUTH_REQUIRED';
  }

  get provider(): string {
    return this.props.provider;
  }
  get accountName(): string {
    return this.props.accountName;
  }
  get storeName(): string {
    return this.props.storeName;
  }
  get status(): string {
    return this.props.status;
  }
  get syncStrategy(): string {
    return this.props.syncStrategy;
  }
  get syncDirection(): string {
    return this.props.syncDirection;
  }
  get encryptedAppKey(): string {
    return this.props.encryptedAppKey;
  }
  get encryptedAppToken(): string {
    return this.props.encryptedAppToken;
  }
  get webhookSecret(): string {
    return this.props.webhookSecret;
  }
  get defaultWarehouseId(): string {
    return this.props.defaultWarehouseId;
  }
  get defaultContactId(): string | undefined {
    return this.props.defaultContactId;
  }
  get connectedAt(): Date | undefined {
    return this.props.connectedAt;
  }
  get lastSyncAt(): Date | undefined {
    return this.props.lastSyncAt;
  }
  get lastSyncError(): string | undefined {
    return this.props.lastSyncError;
  }
  get companyId(): string | undefined {
    return this.props.companyId;
  }
  get encryptedAccessToken(): string | undefined {
    return this.props.encryptedAccessToken;
  }
  get encryptedRefreshToken(): string | undefined {
    return this.props.encryptedRefreshToken;
  }
  get accessTokenExpiresAt(): Date | undefined {
    return this.props.accessTokenExpiresAt;
  }
  get refreshTokenExpiresAt(): Date | undefined {
    return this.props.refreshTokenExpiresAt;
  }
  get meliUserId(): string | undefined {
    return this.props.meliUserId;
  }
  get tokenStatus(): string | undefined {
    return this.props.tokenStatus;
  }
  get createdBy(): string {
    return this.props.createdBy;
  }
}
