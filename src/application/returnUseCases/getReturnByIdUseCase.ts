import { Inject, Injectable, Logger } from '@nestjs/common';
import { ReturnMapper } from '@returns/mappers';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReturnData } from './createReturnUseCase';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

export interface IGetReturnByIdRequest {
  id: string;
  orgId: string;
}

export type IGetReturnByIdResponse = IApiResponseSuccess<IReturnData>;

@Injectable()
export class GetReturnByIdUseCase {
  private readonly logger = new Logger(GetReturnByIdUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository
  ) {}

  async execute(
    request: IGetReturnByIdRequest
  ): Promise<Result<IGetReturnByIdResponse, DomainError>> {
    this.logger.log('Getting return by ID', { returnId: request.id, orgId: request.orgId });

    const returnEntity = await this.returnRepository.findById(request.id, request.orgId);

    if (!returnEntity) {
      return err(new NotFoundError(`Return with ID ${request.id} not found`));
    }

    return ok({
      success: true,
      message: 'Return retrieved successfully',
      data: ReturnMapper.toResponseData(returnEntity),
      timestamp: new Date().toISOString(),
    });
  }
}
