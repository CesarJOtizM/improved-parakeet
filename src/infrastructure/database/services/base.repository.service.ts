import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  BaseEntity,
  FilterOptions,
  PaginationOptions,
  QueryOptions,
  QueryResult,
} from '@shared/types/database.types';

// Tipos genéricos para operaciones de Prisma
type PrismaWhereInput = Record<string, unknown>;
type PrismaOrderByInput = Record<string, 'asc' | 'desc'>;
type PrismaIncludeInput = Record<string, unknown>;

type PrismaModelDelegate<T> = {
  create: (args: { data: Record<string, unknown> }) => Promise<T>;
  findFirst: (args: { where: PrismaWhereInput }) => Promise<T | null>;
  findMany: (args: {
    where?: PrismaWhereInput;
    skip?: number;
    take?: number;
    orderBy?: PrismaOrderByInput;
    include?: PrismaIncludeInput;
  }) => Promise<T[]>;
  update: (args: { where: PrismaWhereInput; data: Record<string, unknown> }) => Promise<T>;
  delete: (args: { where: PrismaWhereInput }) => Promise<T>;
  count: (args: { where?: PrismaWhereInput }) => Promise<number>;
};

type PrismaClientWithModel<T> = {
  [K in string]: PrismaModelDelegate<T>;
};

@Injectable()
export abstract class BaseRepositoryService<T extends BaseEntity> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string
  ) {}

  /**
   * Obtener el modelo de Prisma tipado
   */
  protected getModel(): PrismaModelDelegate<T> {
    return (this.prisma as unknown as PrismaClientWithModel<T>)[this.modelName];
  }

  /**
   * Crear una nueva entidad
   */
  async create(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
    orgId: string
  ): Promise<T> {
    try {
      const result = await this.getModel().create({
        data: { ...data, orgId },
      });

      this.logger.log(`Created ${this.modelName}: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Buscar por ID dentro de una organización
   */
  async findById(id: string, orgId: string): Promise<T> {
    try {
      const result = await this.getModel().findFirst({
        where: { id, orgId },
      });

      if (!result) {
        throw new NotFoundException(
          `${this.modelName} with ID ${id} not found in organization ${orgId}`
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Error finding ${this.modelName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Buscar todos los registros de una organización
   */
  async findAll(orgId: string, options?: QueryOptions): Promise<QueryResult<T>> {
    try {
      const { skip, take, where, orderBy, include } = options || {};

      const [data, total] = await Promise.all([
        this.getModel().findMany({
          where: { ...where, orgId },
          skip,
          take,
          orderBy,
          include,
        }),
        this.getModel().count({
          where: { ...where, orgId },
        }),
      ]);

      return { data, total };
    } catch (error) {
      this.logger.error(`Error finding all ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Actualizar una entidad
   */
  async update(
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'orgId'>>,
    orgId: string
  ): Promise<T> {
    try {
      const result = await this.getModel().update({
        where: { id, orgId },
        data,
      });

      this.logger.log(`Updated ${this.modelName}: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error updating ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar una entidad (soft delete)
   */
  async delete(id: string, orgId: string): Promise<T> {
    try {
      const result = await this.getModel().update({
        where: { id, orgId },
        data: { deletedAt: new Date() },
      });

      this.logger.log(`Soft deleted ${this.modelName}: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error deleting ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar permanentemente una entidad
   */
  async hardDelete(id: string, orgId: string): Promise<T> {
    try {
      const result = await this.getModel().delete({
        where: { id, orgId },
      });

      this.logger.log(`Hard deleted ${this.modelName}: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error hard deleting ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Verificar si existe una entidad
   */
  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.getModel().count({
        where: { id, orgId },
      });

      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking existence of ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Contar registros de una organización
   */
  async count(orgId: string, where?: PrismaWhereInput): Promise<number> {
    try {
      return await this.getModel().count({
        where: { ...where, orgId },
      });
    } catch (error) {
      this.logger.error(`Error counting ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Buscar con filtros personalizados
   */
  async findWithFilters(
    orgId: string,
    filters: FilterOptions & PaginationOptions & { orderBy?: PrismaOrderByInput }
  ): Promise<QueryResult<T>> {
    try {
      const { search, category, status, dateFrom, dateTo, skip, take, orderBy } = filters;

      const where: PrismaWhereInput = { orgId };

      // Aplicar filtros si están definidos
      if (search) {
        const searchConditions = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
        where.OR = searchConditions;
      }

      if (category) {
        where.category = category;
      }

      if (status) {
        where.status = status;
      }

      if (dateFrom || dateTo) {
        const dateFilter: Record<string, unknown> = {};
        if (dateFrom) dateFilter.gte = dateFrom;
        if (dateTo) dateFilter.lte = dateTo;
        where.createdAt = dateFilter;
      }

      const [data, total] = await Promise.all([
        this.getModel().findMany({
          where,
          skip,
          take,
          orderBy: orderBy || { createdAt: 'desc' },
        }),
        this.getModel().count({ where }),
      ]);

      return { data, total };
    } catch (error) {
      this.logger.error(`Error finding ${this.modelName} with filters:`, error);
      throw error;
    }
  }
}
