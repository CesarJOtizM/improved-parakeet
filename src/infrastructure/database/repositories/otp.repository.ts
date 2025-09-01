import { Otp } from '@auth/domain/entities/otp.entity';
import { IOtpRepository } from '@auth/domain/repositories';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OtpRepository implements IOtpRepository {
  private readonly logger = new Logger(OtpRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Otp | null> {
    try {
      const otpData = await this.prisma.otp.findFirst({
        where: { id, orgId },
      });

      if (!otpData) return null;

      return Otp.reconstitute(
        {
          email: otpData.email,
          code: otpData.code,
          type: otpData.type as 'PASSWORD_RESET' | 'ACCOUNT_ACTIVATION' | 'TWO_FACTOR',
          expiresAt: otpData.expiresAt,
          isUsed: otpData.isUsed,
          attempts: otpData.attempts,
          maxAttempts: otpData.maxAttempts,
          ipAddress: otpData.ipAddress || undefined,
          userAgent: otpData.userAgent || undefined,
        },
        otpData.id,
        otpData.orgId
      );
    } catch (error) {
      this.logger.error(`Error finding OTP by ID: ${error}`);
      throw error;
    }
  }

  async findByEmailAndType(email: string, type: string, orgId: string): Promise<Otp | null> {
    try {
      const otpData = await this.prisma.otp.findFirst({
        where: { email, type, orgId },
        orderBy: { createdAt: 'desc' },
      });

      if (!otpData) return null;

      return Otp.reconstitute(
        {
          email: otpData.email,
          code: otpData.code,
          type: otpData.type as 'PASSWORD_RESET' | 'ACCOUNT_ACTIVATION' | 'TWO_FACTOR',
          expiresAt: otpData.expiresAt,
          isUsed: otpData.isUsed,
          attempts: otpData.attempts,
          maxAttempts: otpData.maxAttempts,
          ipAddress: otpData.ipAddress || undefined,
          userAgent: otpData.userAgent || undefined,
        },
        otpData.id,
        otpData.orgId
      );
    } catch (error) {
      this.logger.error(`Error finding OTP by email and type: ${error}`);
      throw error;
    }
  }

  async findValidByEmailAndType(email: string, type: string, orgId: string): Promise<Otp | null> {
    try {
      const otpData = await this.prisma.otp.findFirst({
        where: {
          email,
          type,
          orgId,
          isUsed: false,
          expiresAt: { gt: new Date() },
          attempts: { lt: 3 },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otpData) return null;

      return Otp.reconstitute(
        {
          email: otpData.email,
          code: otpData.code,
          type: otpData.type as 'PASSWORD_RESET' | 'ACCOUNT_ACTIVATION' | 'TWO_FACTOR',
          expiresAt: otpData.expiresAt,
          isUsed: otpData.isUsed,
          attempts: otpData.attempts,
          maxAttempts: otpData.maxAttempts,
          ipAddress: otpData.ipAddress || undefined,
          userAgent: otpData.userAgent || undefined,
        },
        otpData.id,
        otpData.orgId
      );
    } catch (error) {
      this.logger.error(`Error finding valid OTP by email and type: ${error}`);
      throw error;
    }
  }

  async findExpiredOtp(orgId: string): Promise<Otp[]> {
    try {
      const otpDataList = await this.prisma.otp.findMany({
        where: {
          orgId,
          expiresAt: { lt: new Date() },
        },
      });

      return otpDataList.map(otpData =>
        Otp.reconstitute(
          {
            email: otpData.email,
            code: otpData.code,
            type: otpData.type as 'PASSWORD_RESET' | 'ACCOUNT_ACTIVATION' | 'TWO_FACTOR',
            expiresAt: otpData.expiresAt,
            isUsed: otpData.isUsed,
            attempts: otpData.attempts,
            maxAttempts: otpData.maxAttempts,
            ipAddress: otpData.ipAddress || undefined,
            userAgent: otpData.userAgent || undefined,
          },
          otpData.id,
          otpData.orgId
        )
      );
    } catch (error) {
      this.logger.error(`Error finding expired OTPs: ${error}`);
      throw error;
    }
  }

  async findUsedOtp(orgId: string): Promise<Otp[]> {
    try {
      const otpDataList = await this.prisma.otp.findMany({
        where: {
          orgId,
          isUsed: true,
        },
      });

      return otpDataList.map(otpData =>
        Otp.reconstitute(
          {
            email: otpData.email,
            code: otpData.code,
            type: otpData.type as 'PASSWORD_RESET' | 'ACCOUNT_ACTIVATION' | 'TWO_FACTOR',
            expiresAt: otpData.expiresAt,
            isUsed: otpData.isUsed,
            attempts: otpData.attempts,
            maxAttempts: otpData.maxAttempts,
            ipAddress: otpData.ipAddress || undefined,
            userAgent: otpData.userAgent || undefined,
          },
          otpData.id,
          otpData.orgId
        )
      );
    } catch (error) {
      this.logger.error(`Error finding used OTPs: ${error}`);
      throw error;
    }
  }

  async deleteExpiredOtp(orgId: string): Promise<number> {
    try {
      const result = await this.prisma.otp.deleteMany({
        where: {
          orgId,
          expiresAt: { lt: new Date() },
        },
      });
      return result.count;
    } catch (error) {
      this.logger.error(`Error deleting expired OTPs: ${error}`);
      throw error;
    }
  }

  async deleteUsedOtp(orgId: string, hoursOld: number): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
      const result = await this.prisma.otp.deleteMany({
        where: {
          orgId,
          isUsed: true,
          updatedAt: { lt: cutoffTime },
        },
      });
      return result.count;
    } catch (error) {
      this.logger.error(`Error deleting used OTPs: ${error}`);
      throw error;
    }
  }

  async countByEmailAndType(email: string, type: string, orgId: string): Promise<number> {
    try {
      return await this.prisma.otp.count({
        where: { email, type, orgId },
      });
    } catch (error) {
      this.logger.error(`Error counting OTPs by email and type: ${error}`);
      throw error;
    }
  }

  async findRecentOtpByEmail(email: string, orgId: string, hours: number): Promise<Otp[]> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const otpDataList = await this.prisma.otp.findMany({
        where: {
          email,
          orgId,
          createdAt: { gte: cutoffTime },
        },
        orderBy: { createdAt: 'desc' },
      });

      return otpDataList.map(otpData =>
        Otp.reconstitute(
          {
            email: otpData.email,
            code: otpData.code,
            type: otpData.type as 'PASSWORD_RESET' | 'ACCOUNT_ACTIVATION' | 'TWO_FACTOR',
            expiresAt: otpData.expiresAt,
            isUsed: otpData.isUsed,
            attempts: otpData.attempts,
            maxAttempts: otpData.maxAttempts,
            ipAddress: otpData.ipAddress || undefined,
            userAgent: otpData.userAgent || undefined,
          },
          otpData.id,
          otpData.orgId
        )
      );
    } catch (error) {
      this.logger.error(`Error finding recent OTPs by email: ${error}`);
      throw error;
    }
  }

  async save(otp: Otp): Promise<Otp> {
    try {
      const otpData = await this.prisma.otp.upsert({
        where: { id: otp.id },
        update: {
          email: otp.email,
          code: otp.code,
          type: otp.type,
          expiresAt: otp.expiresAt,
          isUsed: otp.isUsed,
          attempts: otp.attempts,
          maxAttempts: otp.maxAttempts,
          ipAddress: otp.ipAddress,
          userAgent: otp.userAgent,
          orgId: otp.orgId,
          updatedAt: new Date(),
        },
        create: {
          id: otp.id,
          email: otp.email,
          code: otp.code,
          type: otp.type,
          expiresAt: otp.expiresAt,
          isUsed: otp.isUsed,
          attempts: otp.attempts,
          maxAttempts: otp.maxAttempts,
          ipAddress: otp.ipAddress,
          userAgent: otp.userAgent,
          orgId: otp.orgId,
        },
      });

      return Otp.reconstitute(
        {
          email: otpData.email,
          code: otpData.code,
          type: otpData.type as 'PASSWORD_RESET' | 'ACCOUNT_ACTIVATION' | 'TWO_FACTOR',
          expiresAt: otpData.expiresAt,
          isUsed: otpData.isUsed,
          attempts: otpData.attempts,
          maxAttempts: otpData.maxAttempts,
          ipAddress: otpData.ipAddress || undefined,
          userAgent: otpData.userAgent || undefined,
        },
        otpData.id,
        otpData.orgId
      );
    } catch (error) {
      this.logger.error(`Error saving OTP: ${error}`);
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.otp.deleteMany({
        where: { id, orgId },
      });
    } catch (error) {
      this.logger.error(`Error deleting OTP: ${error}`);
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Otp[]> {
    try {
      const otpDataList = await this.prisma.otp.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      });

      return otpDataList.map(otpData =>
        Otp.reconstitute(
          {
            email: otpData.email,
            code: otpData.code,
            type: otpData.type as 'PASSWORD_RESET' | 'ACCOUNT_ACTIVATION' | 'TWO_FACTOR',
            expiresAt: otpData.expiresAt,
            isUsed: otpData.isUsed,
            attempts: otpData.attempts,
            maxAttempts: otpData.maxAttempts,
            ipAddress: otpData.ipAddress || undefined,
            userAgent: otpData.userAgent || undefined,
          },
          otpData.id,
          otpData.orgId
        )
      );
    } catch (error) {
      this.logger.error(`Error finding all OTPs: ${error}`);
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.otp.count({
        where: { id, orgId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(`Error checking OTP existence: ${error}`);
      throw error;
    }
  }
}
