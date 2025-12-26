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
        {
          productId,
          warehouseId,
          orgId,
        }
      );
      throw error;
    }
  }
}
