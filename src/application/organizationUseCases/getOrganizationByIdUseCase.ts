import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ORG_NOT_FOUND } from '@shared/constants/error-codes';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IOrganizationRepository } from '@organization/domain/ports/repositories';

export interface IGetOrganizationByIdRequest {
  identifier: string; // Can be either ID or slug
}

export interface IGetOrganizationByIdData {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  taxId?: string;
  settings: Record<string, unknown>;
  timezone: string;
  currency: string;
  dateFormat: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IGetOrganizationByIdResponse = IApiResponseSuccess<IGetOrganizationByIdData>;

@Injectable()
export class GetOrganizationByIdUseCase {
  private readonly logger = new Logger(GetOrganizationByIdUseCase.name);

  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    request: IGetOrganizationByIdRequest
  ): Promise<Result<IGetOrganizationByIdResponse, DomainError>> {
    this.logger.log('Getting organization by identifier', {
      identifier: request.identifier,
    });

    // Try to determine if identifier is an ID (CUID format) or a slug
    // CUIDs typically start with 'c' and are 25 characters long
    // Slugs are lowercase alphanumeric with hyphens
    const isLikelyId = /^[a-z][a-z0-9]{24}$/i.test(request.identifier);

    let organization: Awaited<ReturnType<typeof this.organizationRepository.findById>> | null =
      null;
    let organizationData: { slug: string; domain: string | null } | null = null;

    if (isLikelyId) {
      // Try as ID first
      organization = await this.organizationRepository.findById(request.identifier);
      if (organization) {
        organizationData = await this.prisma.organization.findUnique({
          where: { id: request.identifier },
          select: { slug: true, domain: true },
        });
      }
    }

    // If not found by ID or identifier doesn't look like an ID, try as slug
    if (!organization) {
      organization = await this.organizationRepository.findBySlug(request.identifier);
      if (organization) {
        organizationData = await this.prisma.organization.findUnique({
          where: { slug: request.identifier },
          select: { slug: true, domain: true },
        });
      }
    }

    if (!organization) {
      return err(new NotFoundError('Organization not found', ORG_NOT_FOUND));
    }

    return ok({
      success: true,
      message: 'Organization retrieved successfully',
      data: {
        id: organization.id,
        name: organization.name,
        slug: organizationData?.slug || organization.id,
        domain: organizationData?.domain || undefined,
        taxId: organization.taxId,
        settings: organization.settings,
        timezone: organization.timezone,
        currency: organization.currency,
        dateFormat: organization.dateFormat,
        isActive: organization.isActive,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      } as IGetOrganizationByIdData,
      timestamp: new Date().toISOString(),
    });
  }
}
