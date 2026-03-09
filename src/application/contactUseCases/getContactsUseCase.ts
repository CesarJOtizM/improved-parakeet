import { QueryPagination } from '@infrastructure/database/utils/queryOptimizer';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';
import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';

export interface IGetContactsRequest {
  orgId: string;
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IContactData {
  id: string;
  name: string;
  identification: string;
  type: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IGetContactsResponse = IPaginatedResponse<IContactData>;

@Injectable()
export class GetContactsUseCase {
  private readonly logger = new Logger(GetContactsUseCase.name);

  constructor(
    @Inject('ContactRepository')
    private readonly contactRepository: IContactRepository
  ) {}

  async execute(request: IGetContactsRequest): Promise<Result<IGetContactsResponse, DomainError>> {
    this.logger.log('Getting contacts', { orgId: request.orgId });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const { skip, take } = QueryPagination.fromPage(page, limit);

    let contacts = await this.contactRepository.findAll(request.orgId);

    // Apply filters
    if (request.type) {
      contacts = contacts.filter(c => c.type === request.type);
    }

    if (request.isActive !== undefined) {
      contacts = contacts.filter(c => c.isActive === request.isActive);
    }

    if (request.search) {
      const searchLower = request.search.toLowerCase();
      contacts = contacts.filter(
        c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.identification.toLowerCase().includes(searchLower) ||
          c.address?.toLowerCase().includes(searchLower) ||
          c.notes?.toLowerCase().includes(searchLower)
      );
    }

    const total = contacts.length;
    const paginatedContacts = contacts.slice(skip, skip + take);

    // Count sales per contact
    const salesCountMap = new Map<string, number>();
    for (const contact of paginatedContacts) {
      const count = await this.contactRepository.countSales(contact.id, request.orgId);
      salesCountMap.set(contact.id, count);
    }

    const data: IContactData[] = paginatedContacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      identification: contact.identification,
      type: contact.type,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      notes: contact.notes,
      isActive: contact.isActive,
      salesCount: salesCountMap.get(contact.id) || 0,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }));

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      data.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'identification':
            aValue = a.identification;
            bValue = b.identification;
            break;
          case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
          case 'isActive':
            aValue = a.isActive ? 1 : 0;
            bValue = b.isActive ? 1 : 0;
            break;
          case 'updatedAt':
            aValue = a.updatedAt.getTime();
            bValue = b.updatedAt.getTime();
            break;
          case 'createdAt':
          default:
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const totalPages = Math.ceil(total / limit);

    return ok({
      success: true,
      message: 'Contacts retrieved successfully',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
