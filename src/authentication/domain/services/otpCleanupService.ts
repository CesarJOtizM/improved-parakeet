import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import type { IOtpRepository } from '@auth/domain/repositories';

@Injectable()
export class OtpCleanupService {
  private readonly logger = new Logger(OtpCleanupService.name);

  constructor(
    @Inject('OtpRepository') private readonly otpRepository: IOtpRepository,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Gets all active organization IDs from the database
   */
  private async getActiveOrgIds(): Promise<string[]> {
    try {
      const orgs = await this.prisma.organization.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      return orgs.map(o => o.id);
    } catch (error) {
      this.logger.warn('Failed to fetch orgs for OTP cleanup, falling back to default', error);
      return ['default'];
    }
  }

  /**
   * Limpia OTPs expirados cada hora
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOtp(): Promise<void> {
    try {
      this.logger.log('Starting cleanup of expired OTPs...');

      const orgIds = await this.getActiveOrgIds();
      let totalDeleted = 0;

      for (const orgId of orgIds) {
        const deletedCount = await this.otpRepository.deleteExpiredOtp(orgId);
        totalDeleted += deletedCount;

        if (deletedCount > 0) {
          this.logger.log(`Deleted ${deletedCount} expired OTPs for organization: ${orgId}`);
        }
      }

      if (totalDeleted > 0) {
        this.logger.log(`Cleanup completed. Total OTPs deleted: ${totalDeleted}`);
      } else {
        this.logger.debug('No expired OTPs found to delete');
      }
    } catch (error) {
      this.logger.error('Error during cleanup of expired OTPs:', error);
    }
  }

  /**
   * Limpia OTPs usados cada día
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupUsedOtp(): Promise<void> {
    try {
      this.logger.log('Starting cleanup of used OTPs...');

      const orgIds = await this.getActiveOrgIds();
      let totalDeleted = 0;

      for (const orgId of orgIds) {
        const deletedCount = await this.otpRepository.deleteUsedOtp(orgId, 24);
        totalDeleted += deletedCount;

        if (deletedCount > 0) {
          this.logger.log(`Deleted ${deletedCount} used OTPs for organization: ${orgId}`);
        }
      }

      if (totalDeleted > 0) {
        this.logger.log(`Cleanup of used OTPs completed. Total deleted: ${totalDeleted}`);
      } else {
        this.logger.debug('No used OTPs found to delete');
      }
    } catch (error) {
      this.logger.error('Error during cleanup of used OTPs:', error);
    }
  }

  /**
   * Método manual para limpiar OTPs expirados
   */
  async manualCleanupExpiredOtp(orgId: string): Promise<number> {
    try {
      this.logger.log(`Starting manual cleanup of expired OTPs for org: ${orgId}`);
      const deletedCount = await this.otpRepository.deleteExpiredOtp(orgId);
      this.logger.log(`Manual cleanup completed. OTPs deleted: ${deletedCount}`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Error during manual cleanup of OTPs for org ${orgId}:`, error);
      throw error;
    }
  }

  /**
   * Método manual para limpiar OTPs usados
   */
  async manualCleanupUsedOtp(orgId: string, hoursOld: number = 24): Promise<number> {
    try {
      this.logger.log(
        `Starting manual cleanup of used OTPs for org: ${orgId} (older than ${hoursOld} hours)`
      );
      const deletedCount = await this.otpRepository.deleteUsedOtp(orgId, hoursOld);
      this.logger.log(`Manual cleanup of used OTPs completed. OTPs deleted: ${deletedCount}`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Error during manual cleanup of used OTPs for org ${orgId}:`, error);
      throw error;
    }
  }
}
