import { UserManagementService } from '@auth/domain/services/userManagementService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  USER_INVALID_STATUS,
  USER_NOT_FOUND,
  USER_STATUS_CHANGE_DENIED,
} from '@shared/constants/error-codes';
import {
  BusinessRuleError,
  DomainError,
  err,
  NotFoundError,
  ok,
  Result,
  ValidationError,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserRepository } from '@auth/domain/repositories';
import type { UserStatusValue } from '@auth/domain/valueObjects/userStatus.valueObject';
import type { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';

export interface IChangeUserStatusRequest {
  userId: string;
  orgId: string;
  status: UserStatusValue;
  changedBy: string;
  reason?: string;
  lockDurationMinutes?: number;
}

export interface IChangeUserStatusData {
  id: string;
  email: string;
  username: string;
  status: string;
  orgId: string;
  updatedAt: Date;
}

export type IChangeUserStatusResponse = IApiResponseSuccess<IChangeUserStatusData>;

@Injectable()
export class ChangeUserStatusUseCase {
  private readonly logger = new Logger(ChangeUserStatusUseCase.name);

  constructor(
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
    @Inject('DomainEventDispatcher')
    private readonly eventDispatcher: IDomainEventDispatcher
  ) {}

  async execute(
    request: IChangeUserStatusRequest
  ): Promise<Result<IChangeUserStatusResponse, DomainError>> {
    this.logger.log('Changing user status', {
      userId: request.userId,
      orgId: request.orgId,
      newStatus: request.status,
      changedBy: request.changedBy,
    });

    // Get existing user
    const user = await this.userRepository.findById(request.userId, request.orgId);
    if (!user) {
      return err(new NotFoundError('User not found', USER_NOT_FOUND));
    }

    // Validate status change based on target status
    let validation;
    if (request.status === 'ACTIVE') {
      validation = UserManagementService.canUserBeActivated(user);
    } else if (request.status === 'INACTIVE') {
      validation = UserManagementService.canUserBeDeactivated(user, request.changedBy);
    } else if (request.status === 'LOCKED') {
      validation = UserManagementService.canUserBeLocked(user, request.changedBy);
    } else {
      return err(new ValidationError(`Invalid status: ${request.status}`, USER_INVALID_STATUS));
    }

    if (!validation.isValid) {
      return err(
        new BusinessRuleError(
          `Cannot change status: ${validation.errors.join(', ')}`,
          USER_STATUS_CHANGE_DENIED
        )
      );
    }

    // Change status
    user.changeStatus(
      request.status,
      request.changedBy,
      request.reason,
      request.lockDurationMinutes
    );

    // Save updated user
    const updatedUser = await this.userRepository.save(user);

    // Dispatch domain events
    await this.eventDispatcher.markAndDispatch(updatedUser.domainEvents);
    updatedUser.clearEvents();

    // Update isActive in database to match status
    await this.prisma.user.update({
      where: { id: updatedUser.id },
      data: {
        isActive: request.status === 'ACTIVE',
      },
    });

    this.logger.log('User status changed successfully', {
      userId: updatedUser.id,
      newStatus: request.status,
    });

    return ok({
      success: true,
      message: `User status changed to ${request.status} successfully`,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        status: updatedUser.status.getValue(),
        orgId: updatedUser.orgId,
        updatedAt: updatedUser.updatedAt,
      } as IChangeUserStatusData,
      timestamp: new Date().toISOString(),
    });
  }
}
