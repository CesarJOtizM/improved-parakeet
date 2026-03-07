import { Inject, Injectable, Logger } from '@nestjs/common';
import { ORG_NOT_FOUND } from '@shared/constants/error-codes';
import { DomainError, NotFoundError, err, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IOrganizationRepository } from '@organization/domain/repositories';

export type PickingMode = 'OFF' | 'OPTIONAL' | 'REQUIRED_FULL' | 'REQUIRED_PARTIAL';

const VALID_PICKING_MODES: PickingMode[] = ['OFF', 'OPTIONAL', 'REQUIRED_FULL', 'REQUIRED_PARTIAL'];

export interface ITogglePickingSettingRequest {
  orgId: string;
  pickingEnabled?: boolean;
  pickingMode?: PickingMode;
}

export interface ITogglePickingSettingData {
  orgId: string;
  pickingEnabled: boolean;
  pickingMode: PickingMode;
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
    this.logger.log('Updating picking setting', {
      orgId: request.orgId,
      pickingMode: request.pickingMode,
      pickingEnabled: request.pickingEnabled,
    });

    const org = await this.organizationRepository.findById(request.orgId);

    if (!org) {
      return err(
        new NotFoundError(`Organization with ID ${request.orgId} not found`, ORG_NOT_FOUND)
      );
    }

    // Determine mode: explicit pickingMode takes priority
    let mode: PickingMode;
    if (request.pickingMode && VALID_PICKING_MODES.includes(request.pickingMode)) {
      mode = request.pickingMode;
    } else if (request.pickingEnabled !== undefined) {
      // Legacy boolean: true -> OPTIONAL, false -> OFF
      mode = request.pickingEnabled ? 'OPTIONAL' : 'OFF';
    } else {
      mode = 'OFF';
    }

    const enabled = mode !== 'OFF';

    org.setSetting('pickingEnabled', enabled);
    org.setSetting('pickingMode', mode);

    await this.organizationRepository.update(org);

    this.logger.log('Picking setting updated successfully', {
      orgId: request.orgId,
      pickingMode: mode,
      pickingEnabled: enabled,
    });

    return ok({
      success: true,
      message: `Picking mode set to ${mode}`,
      data: {
        orgId: request.orgId,
        pickingEnabled: enabled,
        pickingMode: mode,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
