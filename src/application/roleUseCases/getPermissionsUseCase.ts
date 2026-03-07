import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

export interface IGetPermissionData {
  id: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
}

export type IGetPermissionsResponse = IApiResponseSuccess<IGetPermissionData[]>;

@Injectable()
export class GetPermissionsUseCase {
  private readonly logger = new Logger(GetPermissionsUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<Result<IGetPermissionsResponse, DomainError>> {
    this.logger.log('Getting all system permissions');

    const permissions = await this.prisma.permission.findMany({
      where: { module: { not: 'ORGANIZATIONS' } },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    this.logger.log('Permissions retrieved successfully', {
      count: permissions.length,
    });

    return ok({
      success: true,
      message: 'Permissions retrieved successfully',
      data: permissions.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        module: p.module,
        action: p.action,
      })) as IGetPermissionData[],
      timestamp: new Date().toISOString(),
    });
  }
}
