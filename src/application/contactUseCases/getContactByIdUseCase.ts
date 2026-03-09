import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import type { IContactData } from './getContactsUseCase';
import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';

export interface IGetContactByIdRequest {
  contactId: string;
  orgId: string;
}

export type IGetContactByIdResponse = IApiResponseSuccess<IContactData>;

@Injectable()
export class GetContactByIdUseCase {
  private readonly logger = new Logger(GetContactByIdUseCase.name);

  constructor(
    @Inject('ContactRepository')
    private readonly contactRepository: IContactRepository
  ) {}

  async execute(
    request: IGetContactByIdRequest
  ): Promise<Result<IGetContactByIdResponse, DomainError>> {
    this.logger.log('Getting contact by ID', {
      contactId: request.contactId,
      orgId: request.orgId,
    });

    const contact = await this.contactRepository.findById(request.contactId, request.orgId);
    if (!contact) {
      return err(new NotFoundError('Contact not found', 'CONTACT_NOT_FOUND'));
    }

    const salesCount = await this.contactRepository.countSales(contact.id, request.orgId);

    return ok({
      success: true,
      message: 'Contact retrieved successfully',
      data: {
        id: contact.id,
        name: contact.name,
        identification: contact.identification,
        type: contact.type,
        email: contact.email,
        phone: contact.phone,
        address: contact.address,
        notes: contact.notes,
        isActive: contact.isActive,
        salesCount,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
