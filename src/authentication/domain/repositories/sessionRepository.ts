import type { Session } from '@auth/domain/entities/session.entity';

export interface SessionRepository {
  findById(id: string, orgId: string): Promise<Session | null>;
  findByUserId(userId: string, orgId: string): Promise<Session[]>;
  findActiveByUserId(userId: string, orgId: string): Promise<Session[]>;
  findActiveByUserIdAndToken(userId: string, orgId: string, token: string): Promise<Session | null>;
  save(session: Session): Promise<Session>;
  delete(id: string, orgId: string): Promise<void>;
  deleteExpired(orgId: string): Promise<number>;
  countActiveByUserId(userId: string, orgId: string): Promise<number>;
  exists(id: string, orgId: string): Promise<boolean>;
}
