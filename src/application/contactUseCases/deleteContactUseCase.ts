import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DomainError,
  NotFoundError,
  BusinessRuleError,
  Result,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';

export interface IDeleteContactRequest {
  contactId: string;
  orgId: string;
}

export type IDeleteContactResponse = IApiResponseSuccess<{ id: string }>;

@Injectable()
export class DeleteContactUseCase {
  private readonly logger = new Logger(DeleteContactUseCase.name);

  constructor(
    @Inject('ContactRepository')
    private readonly contactRepository: IContactRepository
  ) {}

  async execute(
    request: IDeleteContactRequest
  ): Promise<Result<IDeleteContactResponse, DomainError>> {
    this.logger.log('Deleting contact', {
      contactId: request.contactId,
      orgId: request.orgId,
    });

    const contact = await this.contactRepository.findById(request.contactId, request.orgId);
    if (!contact) {
      return err(new NotFoundError('Contact not found', 'CONTACT_NOT_FOUND'));
    }

    const salesCount = await this.contactRepository.countSales(request.contactId, request.orgId);
    if (salesCount > 0) {
      return err(
        new BusinessRuleError(
          `Cannot delete contact with ${salesCount} associated sales. Deactivate it instead.`,
          'CONTACT_HAS_SALES'
        )
      );
    }

    await this.contactRepository.delete(request.contactId, request.orgId);

    return ok({
      success: true,
      message: 'Contact deleted successfully',
      data: { id: request.contactId },
      timestamp: new Date().toISOString(),
    });
  }
}
