import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, err, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IOrganizationRepository } from '@organization/domain/repositories';

export interface IToggleMultiCompanySettingRequest {
  orgId: string;
  multiCompanyEnabled: boolean;
}

export interface IToggleMultiCompanySettingData {
  orgId: string;
  multiCompanyEnabled: boolean;
}

export type IToggleMultiCompanySettingResponse =
  IApiResponseSuccess<IToggleMultiCompanySettingData>;

@Injectable()
export class ToggleMultiCompanySettingUseCase {
  private readonly logger = new Logger(ToggleMultiCompanySettingUseCase.name);

  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository
  ) {}

  async execute(
    request: IToggleMultiCompanySettingRequest
  ): Promise<Result<IToggleMultiCompanySettingResponse, DomainError>> {
    this.logger.log('Toggling multi-company setting', {
      orgId: request.orgId,
      multiCompanyEnabled: request.multiCompanyEnabled,
    });

    const org = await this.organizationRepository.findById(request.orgId);

    if (!org) {
      return err(new NotFoundError(`Organization with ID ${request.orgId} not found`));
    }

    org.setSetting('multiCompanyEnabled', request.multiCompanyEnabled);

    await this.organizationRepository.update(org);

    this.logger.log('Multi-company setting updated successfully', {
      orgId: request.orgId,
      multiCompanyEnabled: request.multiCompanyEnabled,
    });

    return ok({
      success: true,
      message: `Multi-company ${request.multiCompanyEnabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        orgId: request.orgId,
        multiCompanyEnabled: request.multiCompanyEnabled,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
