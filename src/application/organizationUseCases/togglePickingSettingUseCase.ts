import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, err, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IOrganizationRepository } from '@organization/domain/repositories';

export interface ITogglePickingSettingRequest {
  orgId: string;
  pickingEnabled: boolean;
}

export interface ITogglePickingSettingData {
  orgId: string;
  pickingEnabled: boolean;
}

export type ITogglePickingSettingResponse = IApiResponseSuccess<ITogglePickingSettingData>;

@Injectable()
export class TogglePickingSettingUseCase {
  private readonly logger = new Logger(TogglePickingSettingUseCase.name);

  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository
  ) {}

  async execute(
    request: ITogglePickingSettingRequest
  ): Promise<Result<ITogglePickingSettingResponse, DomainError>> {
    this.logger.log('Toggling picking setting', {
      orgId: request.orgId,
      pickingEnabled: request.pickingEnabled,
    });

    const org = await this.organizationRepository.findById(request.orgId);

    if (!org) {
      return err(new NotFoundError(`Organization with ID ${request.orgId} not found`));
    }

    org.setSetting('pickingEnabled', request.pickingEnabled);

    await this.organizationRepository.update(org);

    this.logger.log('Picking setting updated successfully', {
      orgId: request.orgId,
      pickingEnabled: request.pickingEnabled,
    });

    return ok({
      success: true,
      message: `Picking ${request.pickingEnabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        orgId: request.orgId,
        pickingEnabled: request.pickingEnabled,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
