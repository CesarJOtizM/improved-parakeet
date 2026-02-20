import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Category } from '@product/domain/entities/category.entity';
import { ICategoryRepository } from '@product/domain/ports/repositories/iCategoryRepository.port';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  private readonly logger = new Logger(PrismaCategoryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Category | null> {
    try {
      const data = await this.prisma.category.findFirst({
        where: { id, orgId },
      });

      if (!data) return null;

      return Category.reconstitute(
        {
          name: data.name,
          description: data.description || undefined,
          parentId: data.parentId || undefined,
          isActive: data.isActive,
        },
        data.id,
        data.orgId
      );
    } catch (error) {
      this.logger.error(
        `Error finding category by ID: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Category[]> {
    try {
      const data = await this.prisma.category.findMany({
        where: { orgId },
        orderBy: { name: 'asc' },
      });

      return data.map(item =>
        Category.reconstitute(
          {
            name: item.name,
            description: item.description || undefined,
            parentId: item.parentId || undefined,
            isActive: item.isActive,
          },
          item.id,
          item.orgId
        )
      );
    } catch (error) {
      this.logger.error(
        `Error finding all categories: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.category.count({
        where: { id, orgId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking category existence: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async save(category: Category): Promise<Category> {
    try {
      const data = {
        name: category.name,
        description: category.description || null,
        parentId: category.parentId || null,
        isActive: category.isActive,
        orgId: category.orgId,
      };

      const existing = await this.prisma.category.findUnique({
        where: { id: category.id },
      });

      if (existing) {
        const updated = await this.prisma.category.update({
          where: { id: category.id },
          data,
        });

        return Category.reconstitute(
          {
            name: updated.name,
            description: updated.description || undefined,
            parentId: updated.parentId || undefined,
            isActive: updated.isActive,
          },
          updated.id,
          updated.orgId
        );
      }

      const created = await this.prisma.category.create({
        data: { id: category.id, ...data },
      });

      return Category.reconstitute(
        {
          name: created.name,
          description: created.description || undefined,
          parentId: created.parentId || undefined,
          isActive: created.isActive,
        },
        created.id,
        created.orgId
      );
    } catch (error) {
      this.logger.error(`Error saving category: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.category.deleteMany({
        where: { id, orgId },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting category: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByName(name: string, orgId: string): Promise<Category | null> {
    try {
      const data = await this.prisma.category.findFirst({
        where: { name, orgId },
      });

      if (!data) return null;

      return Category.reconstitute(
        {
          name: data.name,
          description: data.description || undefined,
          parentId: data.parentId || undefined,
          isActive: data.isActive,
        },
        data.id,
        data.orgId
      );
    } catch (error) {
      this.logger.error(
        `Error finding category by name: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByParentId(parentId: string, orgId: string): Promise<Category[]> {
    try {
      const data = await this.prisma.category.findMany({
        where: { parentId, orgId },
        orderBy: { name: 'asc' },
      });

      return data.map(item =>
        Category.reconstitute(
          {
            name: item.name,
            description: item.description || undefined,
            parentId: item.parentId || undefined,
            isActive: item.isActive,
          },
          item.id,
          item.orgId
        )
      );
    } catch (error) {
      this.logger.error(
        `Error finding categories by parent: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findRootCategories(orgId: string): Promise<Category[]> {
    try {
      const data = await this.prisma.category.findMany({
        where: { parentId: null, orgId },
        orderBy: { name: 'asc' },
      });

      return data.map(item =>
        Category.reconstitute(
          {
            name: item.name,
            description: item.description || undefined,
            parentId: undefined,
            isActive: item.isActive,
          },
          item.id,
          item.orgId
        )
      );
    } catch (error) {
      this.logger.error(
        `Error finding root categories: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async existsByName(name: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.category.count({
        where: { name, orgId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking category name existence: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }
}
