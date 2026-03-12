import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { IntegrationSkuMapping } from '../../../integrations/shared/domain/entities/integrationSkuMapping.entity.js';

import type { IIntegrationSkuMappingRepository } from '../../../integrations/shared/domain/ports/iIntegrationSkuMappingRepository.port.js';

@Injectable()
export class PrismaIntegrationSkuMappingRepository implements IIntegrationSkuMappingRepository {
  private readonly logger = new Logger(PrismaIntegrationSkuMappingRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private toDomain(
    data: {
      id: string;
      connectionId: string;
      externalSku: string;
      productId: string;
      orgId: string;
    },
    productName?: string,
    productSku?: string
  ): IntegrationSkuMapping {
    return IntegrationSkuMapping.reconstitute(
      {
        connectionId: data.connectionId,
        externalSku: data.externalSku,
        productId: data.productId,
        productName,
        productSku,
      },
      data.id,
      data.orgId
    );
  }

  async findByConnectionId(connectionId: string): Promise<IntegrationSkuMapping[]> {
    try {
      const data = await this.prisma.integrationSkuMapping.findMany({
        where: { connectionId },
        include: { product: { select: { name: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return data.map(item => this.toDomain(item, item.product?.name, item.product?.sku));
    } catch (error) {
      this.logger.error(
        `Error finding SKU mappings by connection: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByExternalSku(
    connectionId: string,
    externalSku: string
  ): Promise<IntegrationSkuMapping | null> {
    try {
      const data = await this.prisma.integrationSkuMapping.findFirst({
        where: { connectionId, externalSku },
      });
      if (!data) return null;
      return this.toDomain(data);
    } catch (error) {
      this.logger.error(
        `Error finding SKU mapping: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async save(mapping: IntegrationSkuMapping): Promise<IntegrationSkuMapping> {
    try {
      const created = await this.prisma.integrationSkuMapping.create({
        data: {
          id: mapping.id,
          connectionId: mapping.connectionId,
          externalSku: mapping.externalSku,
          productId: mapping.productId,
          orgId: mapping.orgId,
        },
      });
      return this.toDomain(created);
    } catch (error) {
      this.logger.error(
        `Error saving SKU mapping: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.integrationSkuMapping.delete({ where: { id } });
    } catch (error) {
      this.logger.error(
        `Error deleting SKU mapping: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }
}
