import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Organization } from '@organization/domain/entities/organization.entity';
import { IOrganizationRepository } from '@organization/domain/repositories/organizationRepository.interface';

@Injectable()
export class OrganizationRepository implements IOrganizationRepository {
  private readonly logger = new Logger(OrganizationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Organization | null> {
    try {
      const organizationData = await this.prisma.organization.findUnique({
        where: { id },
      });

      if (!organizationData) {
        return null;
      }

      return Organization.reconstitute(
        {
          name: organizationData.name,
          taxId: undefined, // Does not exist in current schema
          settings: {},
          timezone: 'UTC', // Default values
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: organizationData.isActive,
        },
        organizationData.id,
        organizationData.id // orgId is the same as id for Organization
      );
    } catch (error) {
      this.logger.error('Error finding organization by ID', { id, error });
      throw error;
    }
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    try {
      const organizationData = await this.prisma.organization.findUnique({
        where: { slug },
      });

      if (!organizationData) {
        return null;
      }

      return Organization.reconstitute(
        {
          name: organizationData.name,
          taxId: undefined, // Does not exist in current schema
          settings: {},
          timezone: 'UTC', // Default values
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: organizationData.isActive,
        },
        organizationData.id,
        organizationData.id // orgId is the same as id for Organization
      );
    } catch (error) {
      this.logger.error('Error finding organization by slug', { slug, error });
      throw error;
    }
  }

  async findByDomain(domain: string): Promise<Organization | null> {
    try {
      const organizationData = await this.prisma.organization.findUnique({
        where: { domain },
      });

      if (!organizationData) {
        return null;
      }

      return Organization.reconstitute(
        {
          name: organizationData.name,
          taxId: undefined, // Does not exist in current schema
          settings: {},
          timezone: 'UTC', // Default values
          currency: 'USD',
          dateFormat: 'YYYY-MM-DD',
          isActive: organizationData.isActive,
        },
        organizationData.id,
        organizationData.id // orgId is the same as id for Organization
      );
    } catch (error) {
      this.logger.error('Error finding organization by domain', { domain, error });
      throw error;
    }
  }

  async findActiveOrganizations(): Promise<Organization[]> {
    try {
      const organizationsData = await this.prisma.organization.findMany({
        where: { isActive: true },
      });

      return organizationsData.map(orgData =>
        Organization.reconstitute(
          {
            name: orgData.name,
            taxId: undefined, // Does not exist in current schema
            settings: {},
            timezone: 'UTC',
            currency: 'USD',
            dateFormat: 'YYYY-MM-DD',
            isActive: orgData.isActive,
          },
          orgData.id,
          orgData.id
        )
      );
    } catch (error) {
      this.logger.error('Error finding active organizations', { error });
      throw error;
    }
  }

  async existsBySlug(slug: string): Promise<boolean> {
    try {
      const count = await this.prisma.organization.count({
        where: { slug },
      });
      return count > 0;
    } catch (error) {
      this.logger.error('Error checking if organization exists by slug', { slug, error });
      throw error;
    }
  }

  async existsByDomain(domain: string): Promise<boolean> {
    try {
      const count = await this.prisma.organization.count({
        where: { domain },
      });
      return count > 0;
    } catch (error) {
      this.logger.error('Error checking if organization exists by domain', { domain, error });
      throw error;
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.prisma.organization.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      this.logger.error('Error checking if organization exists by ID', { id, error });
      throw error;
    }
  }

  async countActiveOrganizations(): Promise<number> {
    try {
      return await this.prisma.organization.count({
        where: { isActive: true },
      });
    } catch (error) {
      this.logger.error('Error counting active organizations', { error });
      throw error;
    }
  }

  async save(organization: Organization): Promise<Organization> {
    try {
      const organizationData = {
        name: organization.name,
        settings: organization.settings,
        timezone: organization.timezone,
        currency: organization.currency,
        dateFormat: organization.dateFormat,
        isActive: organization.isActive,
      };

      if (organization.id) {
        // Update existing organization
        const updatedOrg = await this.prisma.organization.update({
          where: { id: organization.id },
          data: organizationData,
        });
        return Organization.reconstitute(
          {
            name: updatedOrg.name,
            taxId: undefined,
            settings: {},
            timezone: 'UTC',
            currency: 'USD',
            dateFormat: 'YYYY-MM-DD',
            isActive: updatedOrg.isActive,
          },
          updatedOrg.id,
          updatedOrg.id
        );
      } else {
        // Create new organization
        const newOrg = await this.prisma.organization.create({
          data: {
            ...organizationData,
            slug: `org-${Date.now()}`, // Generate temporary slug
          },
        });
        return Organization.reconstitute(
          {
            name: newOrg.name,
            taxId: undefined, // Does not exist in current schema
            settings: {},
            timezone: 'UTC',
            currency: 'USD',
            dateFormat: 'YYYY-MM-DD',
            isActive: newOrg.isActive,
          },
          newOrg.id,
          newOrg.id
        );
      }
    } catch (error) {
      this.logger.error('Error saving organization', {
        organizationId: organization.id,
        error,
      });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.organization.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error('Error deleting organization', { id, error });
      throw error;
    }
  }

  async findByIds(ids: string[]): Promise<Organization[]> {
    try {
      const organizationsData = await this.prisma.organization.findMany({
        where: { id: { in: ids } },
      });

      return organizationsData.map(orgData =>
        Organization.reconstitute(
          {
            name: orgData.name,
            taxId: undefined, // Does not exist in current schema
            settings: {},
            timezone: 'UTC',
            currency: 'USD',
            dateFormat: 'YYYY-MM-DD',
            isActive: orgData.isActive,
          },
          orgData.id,
          orgData.id
        )
      );
    } catch (error) {
      this.logger.error('Error finding organizations by IDs', { ids, error });
      throw error;
    }
  }

  async findAll(): Promise<Organization[]> {
    try {
      const organizationsData = await this.prisma.organization.findMany();

      return organizationsData.map(orgData =>
        Organization.reconstitute(
          {
            name: orgData.name,
            taxId: undefined, // Does not exist in current schema
            settings: {},
            timezone: 'UTC',
            currency: 'USD',
            dateFormat: 'YYYY-MM-DD',
            isActive: orgData.isActive,
          },
          orgData.id,
          orgData.id
        )
      );
    } catch (error) {
      this.logger.error('Error finding all organizations', { error });
      throw error;
    }
  }
}
