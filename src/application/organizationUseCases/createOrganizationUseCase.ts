import { AuthSeed } from '@infrastructure/database/prisma/seeds/auth.seed';
import { InventorySeed } from '@infrastructure/database/prisma/seeds/inventory.seed';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Organization } from '@organization/domain/entities/organization.entity';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IOrganizationRepository } from '@organization/domain/repositories';

export interface ICreateOrganizationRequest {
  name: string;
  slug: string;
  domain?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  createInitialData?: boolean;
  adminUser?: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
  };
}

export interface IOrganizationData {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ICreateOrganizationResponse extends IApiResponseSuccess<IOrganizationData> {
  adminUser?: {
    email: string;
    username: string;
  };
}

@Injectable()
export class CreateOrganizationUseCase {
  private readonly logger = new Logger(CreateOrganizationUseCase.name);

  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(request: ICreateOrganizationRequest): Promise<ICreateOrganizationResponse> {
    try {
      this.logger.log('Creating new organization', {
        name: request.name,
        slug: request.slug,
      });

      // Validate that slug doesn't exist
      if (await this.organizationRepository.existsBySlug(request.slug)) {
        throw new BadRequestException(
          `The slug "${request.slug}" is already in use. Please choose another one.`
        );
      }

      // Validate that domain doesn't exist (if provided)
      if (request.domain && (await this.organizationRepository.existsByDomain(request.domain))) {
        throw new BadRequestException(
          `The domain "${request.domain}" is already in use. Please choose another one.`
        );
      }

      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(request.slug)) {
        throw new BadRequestException(
          'Slug can only contain lowercase letters, numbers and hyphens'
        );
      }

      // Validate slug length
      if (request.slug.length < 3 || request.slug.length > 50) {
        throw new BadRequestException('Slug must be between 3 and 50 characters');
      }

      // Create organization
      const organization = Organization.create(
        {
          name: request.name,
          taxId: undefined,
          settings: {},
          timezone: request.timezone || 'UTC',
          currency: request.currency || 'USD',
          dateFormat: request.dateFormat || 'YYYY-MM-DD',
          isActive: true,
        },
        request.slug
      );

      const savedOrg = await this.organizationRepository.save(
        organization,
        request.slug,
        request.domain
      );

      this.logger.log('Organization created', { organizationId: savedOrg.id });

      // Create roles and permissions (system roles are created once, not per org)
      const authSeed = new AuthSeed(this.prisma);
      const authResult = await authSeed.seed(savedOrg.id);
      this.logger.log('System roles and permissions initialized', {
        rolesCount: authResult.roles.length,
        permissionsCount: authResult.permissions.length,
      });

      // Create admin user if provided
      let adminUserData: { email: string; username: string } | undefined;
      if (request.adminUser) {
        const bcrypt = await import('bcrypt');
        const passwordHash = await bcrypt.hash(request.adminUser.password, 12);

        const adminUser = await this.prisma.user.create({
          data: {
            email: request.adminUser.email,
            username: request.adminUser.username,
            firstName: request.adminUser.firstName,
            lastName: request.adminUser.lastName,
            passwordHash,
            isActive: true,
            orgId: savedOrg.id,
          },
        });

        // Find ADMIN system role
        const adminRole = authResult.roles.find(r => r.name === 'ADMIN');
        if (!adminRole) {
          throw new BadRequestException(
            'ADMIN role not found. Please ensure system roles are initialized.'
          );
        }

        // Assign ADMIN role
        await this.prisma.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: adminRole.id,
            orgId: savedOrg.id,
          },
        });

        adminUserData = {
          email: adminUser.email,
          username: adminUser.username,
        };

        this.logger.log('Admin user created', { userId: adminUser.id });
      }

      // Create initial inventory data (optional)
      if (request.createInitialData) {
        const inventorySeed = new InventorySeed(this.prisma);
        await inventorySeed.seed(savedOrg.id);
        this.logger.log('Initial inventory data created');
      }

      // Get complete organization from DB to get createdAt
      const orgData = await this.prisma.organization.findUnique({
        where: { id: savedOrg.id },
      });

      return {
        success: true,
        message: 'Organization created successfully',
        data: {
          id: savedOrg.id,
          name: savedOrg.name,
          slug: request.slug,
          domain: request.domain,
          isActive: savedOrg.isActive,
          createdAt: orgData?.createdAt || new Date(),
        },
        timestamp: new Date().toISOString(),
        ...(adminUserData && { adminUser: adminUserData }),
      };
    } catch (error) {
      this.logger.error('Error creating organization', {
        error: error instanceof Error ? error.message : error,
        request,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Error creating organization: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
