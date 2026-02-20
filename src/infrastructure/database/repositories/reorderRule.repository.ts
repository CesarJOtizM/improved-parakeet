import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { ReorderRule } from '@stock/domain/entities/reorderRule.entity';
import { IReorderRuleRepository } from '@stock/domain/repositories/reorderRuleRepository.interface';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

@Injectable()
export class PrismaReorderRuleRepository implements IReorderRuleRepository {
  private readonly logger = new Logger(PrismaReorderRuleRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(orgId: string): Promise<ReorderRule[]> {
    try {
      const rules = await this.prisma.reorderRule.findMany({
        where: { orgId },
        include: { product: true, warehouse: true },
        orderBy: { createdAt: 'desc' },
      });

      return rules.map(rule =>
        ReorderRule.reconstitute(
          {
            productId: rule.productId,
            warehouseId: rule.warehouseId,
            minQty: MinQuantity.create(Number(rule.minQty)),
            maxQty: MaxQuantity.create(Number(rule.maxQty)),
            safetyQty: SafetyStock.create(Number(rule.safetyQty)),
          },
          rule.id,
          rule.orgId
        )
      );
    } catch (error) {
      this.logger.error(
        `Error finding all reorder rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { orgId }
      );
      throw error;
    }
  }

  async findById(id: string, orgId: string): Promise<ReorderRule | null> {
    try {
      const rule = await this.prisma.reorderRule.findFirst({
        where: { id, orgId },
        include: { product: true, warehouse: true },
      });

      if (!rule) {
        return null;
      }

      return ReorderRule.reconstitute(
        {
          productId: rule.productId,
          warehouseId: rule.warehouseId,
          minQty: MinQuantity.create(Number(rule.minQty)),
          maxQty: MaxQuantity.create(Number(rule.maxQty)),
          safetyQty: SafetyStock.create(Number(rule.safetyQty)),
        },
        rule.id,
        rule.orgId
      );
    } catch (error) {
      this.logger.error(
        `Error finding reorder rule by id: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id, orgId }
      );
      throw error;
    }
  }

  async findByProductAndWarehouse(
    productId: string,
    warehouseId: string,
    orgId: string
  ): Promise<ReorderRule | null> {
    try {
      const reorderRuleData = await this.prisma.reorderRule.findUnique({
        where: {
          productId_warehouseId_orgId: {
            productId,
            warehouseId,
            orgId,
          },
        },
      });

      if (!reorderRuleData) {
        return null;
      }

      return ReorderRule.reconstitute(
        {
          productId: reorderRuleData.productId,
          warehouseId: reorderRuleData.warehouseId,
          minQty: MinQuantity.create(Number(reorderRuleData.minQty)),
          maxQty: MaxQuantity.create(Number(reorderRuleData.maxQty)),
          safetyQty: SafetyStock.create(Number(reorderRuleData.safetyQty)),
        },
        reorderRuleData.id,
        reorderRuleData.orgId
      );
    } catch (error) {
      this.logger.error(
        `Error finding reorder rule by product and warehouse: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { productId, warehouseId, orgId }
      );
      throw error;
    }
  }

  async create(rule: ReorderRule): Promise<ReorderRule> {
    try {
      const created = await this.prisma.reorderRule.create({
        data: {
          productId: rule.productId,
          warehouseId: rule.warehouseId,
          minQty: rule.minQty.getNumericValue(),
          maxQty: rule.maxQty.getNumericValue(),
          safetyQty: rule.safetyQty.getNumericValue(),
          orgId: rule.orgId,
        },
        include: { product: true, warehouse: true },
      });

      return ReorderRule.reconstitute(
        {
          productId: created.productId,
          warehouseId: created.warehouseId,
          minQty: MinQuantity.create(Number(created.minQty)),
          maxQty: MaxQuantity.create(Number(created.maxQty)),
          safetyQty: SafetyStock.create(Number(created.safetyQty)),
        },
        created.id,
        created.orgId
      );
    } catch (error) {
      this.logger.error(
        `Error creating reorder rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          productId: rule.productId,
          warehouseId: rule.warehouseId,
          orgId: rule.orgId,
        }
      );
      throw error;
    }
  }

  async update(rule: ReorderRule): Promise<ReorderRule> {
    try {
      const updated = await this.prisma.reorderRule.update({
        where: { id: rule.id },
        data: {
          minQty: rule.minQty.getNumericValue(),
          maxQty: rule.maxQty.getNumericValue(),
          safetyQty: rule.safetyQty.getNumericValue(),
        },
        include: { product: true, warehouse: true },
      });

      return ReorderRule.reconstitute(
        {
          productId: updated.productId,
          warehouseId: updated.warehouseId,
          minQty: MinQuantity.create(Number(updated.minQty)),
          maxQty: MaxQuantity.create(Number(updated.maxQty)),
          safetyQty: SafetyStock.create(Number(updated.safetyQty)),
        },
        updated.id,
        updated.orgId
      );
    } catch (error) {
      this.logger.error(
        `Error updating reorder rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id: rule.id, orgId: rule.orgId }
      );
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.reorderRule.deleteMany({
        where: { id, orgId },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting reorder rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id, orgId }
      );
      throw error;
    }
  }
}
