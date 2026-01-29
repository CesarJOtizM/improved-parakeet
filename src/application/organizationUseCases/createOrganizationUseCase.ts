import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Organization } from '@organization/domain/entities/organization.entity';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import * as bcrypt from 'bcrypt';

import type { IOrganizationRepository } from '@organization/domain/repositories';

export interface ICreateOrganizationRequest {
  name: string;
  slug: string;
  domain?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
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
  adminUser?: {
    email: string;
    username: string;
  };
}

export type ICreateOrganizationResponse = IApiResponseSuccess<IOrganizationData>;

@Injectable()
export class CreateOrganizationUseCase {
  private readonly logger = new Logger(CreateOrganizationUseCase.name);

  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    request: ICreateOrganizationRequest
  ): Promise<Result<ICreateOrganizationResponse, DomainError>> {
    this.logger.log('Creating new organization', {
      name: request.name,
      slug: request.slug,
    });

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(request.slug)) {
      return err(
        new ValidationError('Slug can only contain lowercase letters, numbers and hyphens')
      );
    }

    // Validate slug length
    if (request.slug.length < 3 || request.slug.length > 50) {
      return err(new ValidationError('Slug must be between 3 and 50 characters'));
    }

    // Validate that slug doesn't exist
    const slugExists = await this.organizationRepository.existsBySlug(request.slug);
    if (slugExists) {
      return err(
        new ConflictError(
          `The slug "${request.slug}" is already in use. Please choose another one.`
        )
      );
    }

    // Validate that domain doesn't exist (if provided)
    if (request.domain) {
      const domainExists = await this.organizationRepository.existsByDomain(request.domain);
      if (domainExists) {
        return err(
          new ConflictError(
            `The domain "${request.domain}" is already in use. Please choose another one.`
          )
        );
      }
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

    const savedOrg = await this.organizationRepository.create(
      organization,
      request.slug,
      request.domain
    );

    this.logger.log('Organization created', { organizationId: savedOrg.id });

    // Create admin user if provided
    let adminUserData: { email: string; username: string } | undefined;
    if (request.adminUser) {
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

      // Find ADMIN system role (master data - should already exist)
      const adminRole = await this.prisma.role.findFirst({
        where: {
          name: 'ADMIN',
          orgId: null,
        },
      });

      if (!adminRole) {
        return err(
          new BusinessRuleError(
            'ADMIN role not found. Please ensure system roles are initialized before creating organizations.'
          )
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

    // Get complete organization from DB to get createdAt
    const orgData = await this.prisma.organization.findUnique({
      where: { id: savedOrg.id },
    });

    return ok({
      success: true,
      message: 'Organization created successfully',
      data: {
        id: savedOrg.id,
        name: savedOrg.name,
        slug: request.slug,
        domain: request.domain,
        isActive: savedOrg.isActive,
        createdAt: orgData?.createdAt || new Date(),
        ...(adminUserData && { adminUser: adminUserData }),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
