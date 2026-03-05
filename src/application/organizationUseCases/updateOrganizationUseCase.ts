import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ORG_NAME_CONFLICT,
  ORG_NOT_FOUND,
  ORG_SLUG_CONFLICT,
  ORG_SLUG_INVALID,
} from '@shared/constants/error-codes';
import {
  ConflictError,
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IOrganizationRepository } from '@organization/domain/repositories';

export interface IUpdateOrganizationRequest {
  id: string;
  name?: string;
  slug?: string;
  domain?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  isActive?: boolean;
}

export interface IOrganizationData {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  isActive: boolean;
  updatedAt: Date;
}

export type IUpdateOrganizationResponse = IApiResponseSuccess<IOrganizationData>;

@Injectable()
export class UpdateOrganizationUseCase {
  private readonly logger = new Logger(UpdateOrganizationUseCase.name);

  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    request: IUpdateOrganizationRequest
  ): Promise<Result<IUpdateOrganizationResponse, DomainError>> {
    this.logger.log('Updating organization', {
      organizationId: request.id,
    });

    // Find existing organization
    const organization = await this.organizationRepository.findById(request.id);

    if (!organization) {
      return err(new NotFoundError('Organization not found', ORG_NOT_FOUND));
    }

    // Get current organization data from DB to check current slug
    const currentOrgData = await this.prisma.organization.findUnique({
      where: { id: request.id },
      select: { slug: true, domain: true },
    });

    if (!currentOrgData) {
      return err(new NotFoundError('Organization not found', ORG_NOT_FOUND));
    }

    // Validate slug format if provided
    if (request.slug !== undefined) {
      if (!/^[a-z0-9-]+$/.test(request.slug)) {
        return err(
          new ValidationError(
            'Slug can only contain lowercase letters, numbers and hyphens',
            ORG_SLUG_INVALID
          )
        );
      }

      // Validate slug length
      if (request.slug.length < 3 || request.slug.length > 50) {
        return err(
          new ValidationError('Slug must be between 3 and 50 characters', ORG_SLUG_INVALID)
        );
      }

      // Check if slug is different and already exists
      if (request.slug !== currentOrgData.slug) {
        const slugExists = await this.organizationRepository.existsBySlug(request.slug);
        if (slugExists) {
          return err(
            new ConflictError(
              `The slug "${request.slug}" is already in use. Please choose another one.`,
              ORG_SLUG_CONFLICT
            )
          );
        }
      }
    }

    // Validate domain if provided
    if (request.domain !== undefined && request.domain !== currentOrgData.domain) {
      const domainExists = await this.organizationRepository.existsByDomain(request.domain);
      if (domainExists) {
        return err(
          new ConflictError(
            `The domain "${request.domain}" is already in use. Please choose another one.`,
            ORG_NAME_CONFLICT
          )
        );
      }
    }

    // Build update props
    const updateProps: Partial<{
      name: string;
      timezone: string;
      currency: string;
      dateFormat: string;
      isActive: boolean;
    }> = {};

    if (request.name !== undefined) {
      updateProps.name = request.name;
    }

    if (request.timezone !== undefined) {
      updateProps.timezone = request.timezone;
    }

    if (request.currency !== undefined) {
      updateProps.currency = request.currency;
    }

    if (request.dateFormat !== undefined) {
      updateProps.dateFormat = request.dateFormat;
    }

    if (request.isActive !== undefined) {
      updateProps.isActive = request.isActive;
    }

    // Update organization entity
    if (Object.keys(updateProps).length > 0) {
      organization.update(updateProps);
    }

    // Save updated organization
    const updatedOrg = await this.organizationRepository.update(
      organization,
      request.slug,
      request.domain
    );

    this.logger.log('Organization updated successfully', {
      organizationId: updatedOrg.id,
    });

    // Get complete organization from DB to get slug, domain, and updatedAt
    const orgData = await this.prisma.organization.findUnique({
      where: { id: updatedOrg.id },
    });

    if (!orgData) {
      return err(new NotFoundError('Organization not found after update', ORG_NOT_FOUND));
    }

    return ok({
      success: true,
      message: 'Organization updated successfully',
      data: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        slug: orgData.slug,
        domain: orgData.domain || undefined,
        isActive: updatedOrg.isActive,
        updatedAt: orgData.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
