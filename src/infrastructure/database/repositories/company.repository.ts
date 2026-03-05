import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Company } from '@inventory/companies/domain/entities/company.entity';
import { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

@Injectable()
export class PrismaCompanyRepository implements ICompanyRepository {
  private readonly logger = new Logger(PrismaCompanyRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Company | null> {
    try {
      const data = await this.prisma.company.findFirst({
        where: { id, orgId },
      });

      if (!data) return null;

      return Company.reconstitute(
        {
          name: data.name,
          code: data.code,
          description: data.description || undefined,
          isActive: data.isActive,
        },
        data.id,
        data.orgId
      );
    } catch (error) {
      this.logger.error(
        `Error finding company by ID: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Company[]> {
    try {
      const data = await this.prisma.company.findMany({
        where: { orgId },
        orderBy: { name: 'asc' },
      });

      return data.map(item =>
        Company.reconstitute(
          {
            name: item.name,
            code: item.code,
            description: item.description || undefined,
            isActive: item.isActive,
          },
          item.id,
          item.orgId
        )
      );
    } catch (error) {
      this.logger.error(
        `Error finding all companies: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.company.count({
        where: { id, orgId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking company existence: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async save(company: Company): Promise<Company> {
    try {
      const data = {
        name: company.name,
        code: company.code,
        description: company.description || null,
        isActive: company.isActive,
        orgId: company.orgId,
      };

      const existing = await this.prisma.company.findUnique({
        where: { id: company.id },
      });

      if (existing) {
        const updated = await this.prisma.company.update({
          where: { id: company.id },
          data,
        });

        return Company.reconstitute(
          {
            name: updated.name,
            code: updated.code,
            description: updated.description || undefined,
            isActive: updated.isActive,
          },
          updated.id,
          updated.orgId
        );
      }

      const created = await this.prisma.company.create({
        data: { id: company.id, ...data },
      });

      return Company.reconstitute(
        {
          name: created.name,
          code: created.code,
          description: created.description || undefined,
          isActive: created.isActive,
        },
        created.id,
        created.orgId
      );
    } catch (error) {
      this.logger.error(`Error saving company: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.company.deleteMany({
        where: { id, orgId },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting company: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByCode(code: string, orgId: string): Promise<Company | null> {
    try {
      const data = await this.prisma.company.findFirst({
        where: { code, orgId },
      });

      if (!data) return null;

      return Company.reconstitute(
        {
          name: data.name,
          code: data.code,
          description: data.description || undefined,
          isActive: data.isActive,
        },
        data.id,
        data.orgId
      );
    } catch (error) {
      this.logger.error(
        `Error finding company by code: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByName(name: string, orgId: string): Promise<Company | null> {
    try {
      const data = await this.prisma.company.findFirst({
        where: { name, orgId },
      });

      if (!data) return null;

      return Company.reconstitute(
        {
          name: data.name,
          code: data.code,
          description: data.description || undefined,
          isActive: data.isActive,
        },
        data.id,
        data.orgId
      );
    } catch (error) {
      this.logger.error(
        `Error finding company by name: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async existsByCode(code: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.company.count({
        where: { code, orgId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking company code existence: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async existsByName(name: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.company.count({
        where: { name, orgId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking company name existence: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async countProducts(companyId: string, orgId: string): Promise<number> {
    try {
      return await this.prisma.product.count({
        where: { companyId, orgId },
      });
    } catch (error) {
      this.logger.error(
        `Error counting company products: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }
}
