import { Otp } from '@auth/domain/entities/otp.entity';
import { IReadRepository, IWriteRepository } from '@shared/domain/repository';

export interface IOtpRepository extends IReadRepository<Otp>, IWriteRepository<Otp> {
  findByEmailAndType(email: string, type: string, orgId: string): Promise<Otp | null>;
  findValidByEmailAndType(email: string, type: string, orgId: string): Promise<Otp | null>;
  findExpiredOtp(orgId: string): Promise<Otp[]>;
  findUsedOtp(orgId: string): Promise<Otp[]>;
  deleteExpiredOtp(orgId: string): Promise<number>;
  deleteUsedOtp(orgId: string, hoursOld: number): Promise<number>;
  countByEmailAndType(email: string, type: string, orgId: string): Promise<number>;
  findRecentOtpByEmail(email: string, orgId: string, hours: number): Promise<Otp[]>;
}
