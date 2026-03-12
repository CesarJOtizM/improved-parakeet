import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { IntegrationSyncLog } from '@integrations/shared/domain/entities/integrationSyncLog.entity';

import type { IIntegrationSyncLogRepository } from '@integrations/shared/domain/ports/iIntegrationSyncLogRepository.port';
import type { Prisma } from '../generated/prisma/index.js';

@Injectable()
export class PrismaIntegrationSyncLogRepository implements IIntegrationSyncLogRepository {
  private readonly logger = new Logger(PrismaIntegrationSyncLogRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private toDomain(data: {
    id: string;
    connectionId: string;
    externalOrderId: string;
    action: string;
    saleId: string | null;
    saleNumber: string | null;
    contactId: string | null;
    errorMessage: string | null;
    rawPayload: Prisma.JsonValue;
    orgId: string;
    processedAt: Date;
  }): IntegrationSyncLog {
    return IntegrationSyncLog.reconstitute(
      {
        connectionId: data.connectionId,
        externalOrderId: data.externalOrderId,
        action: data.action,
        saleId: data.saleId || undefined,
        saleNumber: data.saleNumber || undefined,
        contactId: data.contactId || undefined,
        errorMessage: data.errorMessage || undefined,
        rawPayload: (data.rawPayload as Record<string, unknown>) || undefined,
        processedAt: data.processedAt,
      },
      data.id,
      data.orgId
    );
  }

  async save(log: IntegrationSyncLog): Promise<IntegrationSyncLog> {
    try {
      const created = await this.prisma.integrationSyncLog.create({
        data: {
          id: log.id,
          connectionId: log.connectionId,
          externalOrderId: log.externalOrderId,
          action: log.action,
          saleId: log.saleId || null,
          saleNumber: log.saleNumber || null,
          contactId: log.contactId || null,
          errorMessage: log.errorMessage || null,
          rawPayload: (log.rawPayload as Prisma.InputJsonValue) || undefined,
          orgId: log.orgId,
          processedAt: log.processedAt,
        },
      });
      return this.toDomain(created);
    } catch (error) {
      this.logger.error(`Error saving sync log: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async findByExternalOrderId(
    connectionId: string,
    externalOrderId: string
  ): Promise<IntegrationSyncLog | null> {
    try {
      const data = await this.prisma.integrationSyncLog.findFirst({
        where: { connectionId, externalOrderId },
      });
      if (!data) return null;
      return this.toDomain(data);
    } catch (error) {
      this.logger.error(
        `Error finding sync log by external order ID: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByConnectionId(
    connectionId: string,
    page: number,
    limit: number,
    filters?: { action?: string }
  ): Promise<{ data: IntegrationSyncLog[]; total: number }> {
    try {
      const where: Record<string, unknown> = { connectionId };
      if (filters?.action) where.action = filters.action;

      const [items, total] = await Promise.all([
        this.prisma.integrationSyncLog.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { processedAt: 'desc' },
        }),
        this.prisma.integrationSyncLog.count({ where }),
      ]);

      return {
        data: items.map(item => this.toDomain(item)),
        total,
      };
    } catch (error) {
      this.logger.error(
        `Error finding sync logs by connection: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findFailedByConnectionId(connectionId: string): Promise<IntegrationSyncLog[]> {
    try {
      const data = await this.prisma.integrationSyncLog.findMany({
        where: { connectionId, action: 'FAILED' },
        orderBy: { processedAt: 'desc' },
      });
      return data.map(item => this.toDomain(item));
    } catch (error) {
      this.logger.error(
        `Error finding failed sync logs: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async update(log: IntegrationSyncLog): Promise<IntegrationSyncLog> {
    try {
      const updated = await this.prisma.integrationSyncLog.update({
        where: { id: log.id },
        data: {
          action: log.action,
          saleId: log.saleId || null,
          saleNumber: log.saleNumber || null,
          contactId: log.contactId || null,
          errorMessage: log.errorMessage || null,
        },
      });
      return this.toDomain(updated);
    } catch (error) {
      this.logger.error(
        `Error updating sync log: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }
}
