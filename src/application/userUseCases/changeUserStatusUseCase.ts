import { UserManagementService } from '@auth/domain/services/userManagementService';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IUserRepository } from '@auth/domain/repositories';
import type { UserStatusValue } from '@auth/domain/valueObjects/userStatus.valueObject';

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
    private readonly prisma: PrismaService
  ) {}

  async execute(request: IChangeUserStatusRequest): Promise<IChangeUserStatusResponse> {
    this.logger.log('Changing user status', {
      userId: request.userId,
      orgId: request.orgId,
      newStatus: request.status,
      changedBy: request.changedBy,
    });

    // Get existing user
    const user = await this.userRepository.findById(request.userId, request.orgId);
    if (!user) {
      throw new NotFoundException('User not found');
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
      throw new BadRequestException(`Invalid status: ${request.status}`);
    }

    if (!validation.isValid) {
      throw new BadRequestException(`Cannot change status: ${validation.errors.join(', ')}`);
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

    return {
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
    };
  }
}
