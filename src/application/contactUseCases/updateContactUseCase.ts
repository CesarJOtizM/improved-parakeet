import { Inject, Injectable, Logger } from '@nestjs/common';
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
import type { IContactData } from './getContactsUseCase';
import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';

export interface IUpdateContactRequest {
  contactId: string;
  orgId: string;
  name?: string;
  identification?: string;
  type?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export type IUpdateContactResponse = IApiResponseSuccess<IContactData>;

@Injectable()
export class UpdateContactUseCase {
  private readonly logger = new Logger(UpdateContactUseCase.name);

  constructor(
    @Inject('ContactRepository')
    private readonly contactRepository: IContactRepository
  ) {}

  async execute(
    request: IUpdateContactRequest
  ): Promise<Result<IUpdateContactResponse, DomainError>> {
    this.logger.log('Updating contact', {
      contactId: request.contactId,
      orgId: request.orgId,
    });

    try {
      const contact = await this.contactRepository.findById(request.contactId, request.orgId);
      if (!contact) {
        return err(new NotFoundError('Contact not found', 'CONTACT_NOT_FOUND'));
      }

      // Check identification uniqueness if changing it
      if (request.identification && request.identification !== contact.identification) {
        const identExists = await this.contactRepository.existsByIdentification(
          request.identification,
          request.orgId
        );
        if (identExists) {
          return err(
            new ConflictError(
              'A contact with this identification already exists',
              'CONTACT_IDENTIFICATION_CONFLICT'
            )
          );
        }
      }

      contact.update({
        name: request.name,
        identification: request.identification,
        type: request.type,
        address: request.address,
        notes: request.notes,
        isActive: request.isActive,
      });

      const saved = await this.contactRepository.save(contact);
      const salesCount = await this.contactRepository.countSales(saved.id, request.orgId);

      return ok({
        success: true,
        message: 'Contact updated successfully',
        data: {
          id: saved.id,
          name: saved.name,
          identification: saved.identification,
          type: saved.type,
          address: saved.address,
          notes: saved.notes,
          isActive: saved.isActive,
          salesCount,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error updating contact', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string };
        if (prismaError.code === 'P2002') {
          return err(
            new ConflictError(
              'A contact with this identification already exists',
              'CONTACT_CONFLICT'
            )
          );
        }
      }

      return err(
        new ValidationError(
          `Failed to update contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'CONTACT_UPDATE_ERROR'
        )
      );
    }
  }
}
