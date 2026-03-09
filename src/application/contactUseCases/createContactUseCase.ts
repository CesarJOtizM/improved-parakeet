import { Inject, Injectable, Logger } from '@nestjs/common';
import { Contact } from '@contacts/domain/entities/contact.entity';
import {
  ConflictError,
  DomainError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import type { IContactData } from './getContactsUseCase';
import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';

export interface ICreateContactRequest {
  name: string;
  identification: string;
  type?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  orgId: string;
}

export type ICreateContactResponse = IApiResponseSuccess<IContactData>;

@Injectable()
export class CreateContactUseCase {
  private readonly logger = new Logger(CreateContactUseCase.name);

  constructor(
    @Inject('ContactRepository')
    private readonly contactRepository: IContactRepository
  ) {}

  async execute(
    request: ICreateContactRequest
  ): Promise<Result<ICreateContactResponse, DomainError>> {
    this.logger.log('Creating contact', { name: request.name, orgId: request.orgId });

    try {
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

      const contact = Contact.create(
        {
          name: request.name,
          identification: request.identification,
          type: request.type || 'CUSTOMER',
          email: request.email,
          phone: request.phone,
          address: request.address,
          notes: request.notes,
        },
        request.orgId
      );

      const saved = await this.contactRepository.save(contact);

      return ok({
        success: true,
        message: 'Contact created successfully',
        data: {
          id: saved.id,
          name: saved.name,
          identification: saved.identification,
          type: saved.type,
          email: saved.email,
          phone: saved.phone,
          address: saved.address,
          notes: saved.notes,
          isActive: saved.isActive,
          salesCount: 0,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error creating contact', {
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
          `Failed to create contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'CONTACT_CREATION_ERROR'
        )
      );
    }
  }
}
