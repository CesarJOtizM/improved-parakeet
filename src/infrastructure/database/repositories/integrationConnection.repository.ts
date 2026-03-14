import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { IntegrationConnection } from '@integrations/shared/domain/entities/integrationConnection.entity';

import type { IIntegrationConnectionRepository } from '@integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

@Injectable()
export class PrismaIntegrationConnectionRepository implements IIntegrationConnectionRepository {
  private readonly logger = new Logger(PrismaIntegrationConnectionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private toDomain(data: {
    id: string;
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
    defaultContactId: string | null;
    connectedAt: Date | null;
    lastSyncAt: Date | null;
    lastSyncError: string | null;
    companyId: string | null;
    encryptedAccessToken: string | null;
    encryptedRefreshToken: string | null;
    accessTokenExpiresAt: Date | null;
    refreshTokenExpiresAt: Date | null;
    meliUserId: string | null;
    tokenStatus: string | null;
    orgId: string;
    createdBy: string;
  }): IntegrationConnection {
    return IntegrationConnection.reconstitute(
      {
        provider: data.provider,
        accountName: data.accountName,
        storeName: data.storeName,
        status: data.status,
        syncStrategy: data.syncStrategy,
        syncDirection: data.syncDirection,
        encryptedAppKey: data.encryptedAppKey,
        encryptedAppToken: data.encryptedAppToken,
        webhookSecret: data.webhookSecret,
        defaultWarehouseId: data.defaultWarehouseId,
        defaultContactId: data.defaultContactId || undefined,
        connectedAt: data.connectedAt || undefined,
        lastSyncAt: data.lastSyncAt || undefined,
        lastSyncError: data.lastSyncError || undefined,
        companyId: data.companyId || undefined,
        encryptedAccessToken: data.encryptedAccessToken || undefined,
        encryptedRefreshToken: data.encryptedRefreshToken || undefined,
        accessTokenExpiresAt: data.accessTokenExpiresAt || undefined,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt || undefined,
        meliUserId: data.meliUserId || undefined,
        tokenStatus: data.tokenStatus || undefined,
        createdBy: data.createdBy,
      },
      data.id,
      data.orgId
    );
  }

  async findByOrgId(
    orgId: string,
    filters?: { provider?: string; status?: string }
  ): Promise<IntegrationConnection[]> {
    try {
      const where: Record<string, unknown> = { orgId };
      if (filters?.provider) where.provider = filters.provider;
      if (filters?.status) where.status = filters.status;

      const data = await this.prisma.integrationConnection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return data.map(item => this.toDomain(item));
    } catch (error) {
      this.logger.error(
        `Error finding connections by orgId: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findById(id: string, orgId: string): Promise<IntegrationConnection | null> {
    try {
      const data = await this.prisma.integrationConnection.findFirst({
        where: { id, orgId },
      });
      if (!data) return null;
      return this.toDomain(data);
    } catch (error) {
      this.logger.error(
        `Error finding connection by ID: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByProviderAndAccount(
    provider: string,
    accountName: string,
    orgId: string
  ): Promise<IntegrationConnection | null> {
    try {
      const data = await this.prisma.integrationConnection.findFirst({
        where: { provider, accountName, orgId },
      });
      if (!data) return null;
      return this.toDomain(data);
    } catch (error) {
      this.logger.error(
        `Error finding connection by provider and account: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByProviderAndAccountGlobal(
    provider: string,
    accountName: string
  ): Promise<IntegrationConnection | null> {
    try {
      const data = await this.prisma.integrationConnection.findFirst({
        where: { provider, accountName },
      });
      if (!data) return null;
      return this.toDomain(data);
    } catch (error) {
      this.logger.error(
        `Error finding connection globally: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findAllConnectedForPolling(): Promise<IntegrationConnection[]> {
    try {
      const data = await this.prisma.integrationConnection.findMany({
        where: {
          status: 'CONNECTED',
          syncStrategy: { in: ['POLLING', 'BOTH'] },
          lastSyncAt: { not: null },
        },
      });
      return data.map(item => this.toDomain(item));
    } catch (error) {
      this.logger.error(
        `Error finding connections for polling: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async save(connection: IntegrationConnection): Promise<IntegrationConnection> {
    try {
      const data = {
        provider: connection.provider,
        accountName: connection.accountName,
        storeName: connection.storeName,
        status: connection.status,
        syncStrategy: connection.syncStrategy,
        syncDirection: connection.syncDirection,
        encryptedAppKey: connection.encryptedAppKey,
        encryptedAppToken: connection.encryptedAppToken,
        webhookSecret: connection.webhookSecret,
        defaultWarehouseId: connection.defaultWarehouseId,
        defaultContactId: connection.defaultContactId || null,
        connectedAt: connection.connectedAt || null,
        lastSyncAt: connection.lastSyncAt || null,
        lastSyncError: connection.lastSyncError || null,
        companyId: connection.companyId || null,
        encryptedAccessToken: connection.encryptedAccessToken || null,
        encryptedRefreshToken: connection.encryptedRefreshToken || null,
        accessTokenExpiresAt: connection.accessTokenExpiresAt || null,
        refreshTokenExpiresAt: connection.refreshTokenExpiresAt || null,
        meliUserId: connection.meliUserId || null,
        tokenStatus: connection.tokenStatus || null,
        orgId: connection.orgId,
        createdBy: connection.createdBy,
      };

      const created = await this.prisma.integrationConnection.create({
        data: { id: connection.id, ...data },
      });
      return this.toDomain(created);
    } catch (error) {
      this.logger.error(
        `Error saving connection: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async update(connection: IntegrationConnection): Promise<IntegrationConnection> {
    try {
      const updated = await this.prisma.integrationConnection.update({
        where: { id: connection.id },
        data: {
          storeName: connection.storeName,
          status: connection.status,
          syncStrategy: connection.syncStrategy,
          syncDirection: connection.syncDirection,
          encryptedAppKey: connection.encryptedAppKey,
          encryptedAppToken: connection.encryptedAppToken,
          defaultWarehouseId: connection.defaultWarehouseId,
          defaultContactId: connection.defaultContactId || null,
          connectedAt: connection.connectedAt || null,
          lastSyncAt: connection.lastSyncAt || null,
          lastSyncError: connection.lastSyncError || null,
          companyId: connection.companyId || null,
          encryptedAccessToken: connection.encryptedAccessToken || null,
          encryptedRefreshToken: connection.encryptedRefreshToken || null,
          accessTokenExpiresAt: connection.accessTokenExpiresAt || null,
          refreshTokenExpiresAt: connection.refreshTokenExpiresAt || null,
          meliUserId: connection.meliUserId || null,
          tokenStatus: connection.tokenStatus || null,
        },
      });
      return this.toDomain(updated);
    } catch (error) {
      this.logger.error(
        `Error updating connection: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByMeliUserId(meliUserId: string): Promise<IntegrationConnection | null> {
    try {
      const data = await this.prisma.integrationConnection.findFirst({
        where: { meliUserId, provider: 'MERCADOLIBRE' },
      });
      if (!data) return null;
      return this.toDomain(data);
    } catch (error) {
      this.logger.error(
        `Error finding connection by MeLi user ID: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.integrationConnection.deleteMany({ where: { id, orgId } });
    } catch (error) {
      this.logger.error(
        `Error deleting connection: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }
}
