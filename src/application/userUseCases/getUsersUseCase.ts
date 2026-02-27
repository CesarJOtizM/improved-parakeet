import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, Result, ok } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { IUserRepository } from '@auth/domain/repositories';

export interface IGetUsersRequest {
  orgId: string;
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IUserListItem {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  lastLoginAt?: Date;
  createdAt: Date;
}

export type IGetUsersResponse = IPaginatedResponse<IUserListItem>;

@Injectable()
export class GetUsersUseCase {
  private readonly logger = new Logger(GetUsersUseCase.name);

  constructor(@Inject('UserRepository') private readonly userRepository: IUserRepository) {}

  async execute(request: IGetUsersRequest): Promise<Result<IGetUsersResponse, DomainError>> {
    this.logger.log('Getting users', {
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
      status: request.status,
    });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const skip = (page - 1) * limit;

    // Get users based on filters
    let users;
    if (request.status) {
      users = await this.userRepository.findByStatus(request.status, request.orgId);
    } else {
      // For now, get all users (in a real implementation, we'd have pagination in repository)
      users = await this.userRepository.findAll(request.orgId);
    }

    // Apply search filter if provided
    if (request.search) {
      const searchLower = request.search.toLowerCase();
      users = users.filter(
        user =>
          user.email.toLowerCase().includes(searchLower) ||
          user.username.toLowerCase().includes(searchLower) ||
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      users.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'email':
            aValue = a.email;
            bValue = b.email;
            break;
          case 'username':
            aValue = a.username;
            bValue = b.username;
            break;
          case 'firstName':
            aValue = a.firstName;
            bValue = b.firstName;
            break;
          case 'lastName':
            aValue = a.lastName;
            bValue = b.lastName;
            break;
          case 'status':
            aValue = a.status.getValue();
            bValue = b.status.getValue();
            break;
          case 'lastLoginAt':
            aValue = a.lastLoginAt?.getTime() || 0;
            bValue = b.lastLoginAt?.getTime() || 0;
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

    // Apply pagination
    const total = users.length;
    const paginatedUsers = users.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return ok({
      success: true,
      message: 'Users retrieved successfully',
      data: paginatedUsers.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status.getValue(),
        roles: user.roles || [],
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      })),
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
