import { Session } from '@auth/domain/entities/session.entity';
import { IReadRepository, IWriteRepository } from '@shared/domain/repository';

export interface ISessionRepository extends IReadRepository<Session>, IWriteRepository<Session> {
  findByToken(token: string): Promise<Session | null>;
  findByUserId(userId: string, orgId: string): Promise<Session[]>;
  findActiveSessions(userId: string, orgId: string): Promise<Session[]>;
  findActiveByUserIdAndToken(userId: string, orgId: string, token: string): Promise<Session | null>;
  findExpiredSessions(): Promise<Session[]>;
  findSessionsByIpAddress(ipAddress: string, orgId: string): Promise<Session[]>;
  findSessionsByUserAgent(userAgent: string, orgId: string): Promise<Session[]>;
  findSessionsByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Session[]>;
  countActiveSessions(userId: string, orgId: string): Promise<number>;
  deleteExpiredSessions(): Promise<number>;
  deleteSessionsByUserId(userId: string, orgId: string): Promise<number>;
  deleteSessionsByToken(token: string): Promise<number>;
}
