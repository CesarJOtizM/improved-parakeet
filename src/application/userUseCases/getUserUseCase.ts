import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserRepository } from '@auth/domain/repositories';

export interface IGetUserRequest {
  userId: string;
  orgId: string;
}

export interface IGetUserData {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  permissions: string[];
  lastLoginAt?: Date;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IGetUserResponse = IApiResponseSuccess<IGetUserData>;

@Injectable()
export class GetUserUseCase {
  private readonly logger = new Logger(GetUserUseCase.name);

  constructor(@Inject('UserRepository') private readonly userRepository: IUserRepository) {}

  async execute(request: IGetUserRequest): Promise<Result<IGetUserResponse, DomainError>> {
    this.logger.log('Getting user', { userId: request.userId, orgId: request.orgId });

    const user = await this.userRepository.findById(request.userId, request.orgId);

    if (!user) {
      return err(new NotFoundError('User not found'));
    }

    return ok({
      success: true,
      message: 'User retrieved successfully',
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status.getValue(),
        roles: user.roles || [],
        permissions: user.permissions || [],
        lastLoginAt: user.lastLoginAt,
        orgId: user.orgId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      } as IGetUserData,
      timestamp: new Date().toISOString(),
    });
  }
}
