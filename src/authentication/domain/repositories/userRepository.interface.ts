import { User } from '@auth/domain/entities/user.entity';
import { ReadRepository, WriteRepository } from '@shared/domain/repository';

export interface UserRepository extends ReadRepository<User>, WriteRepository<User> {
  findByEmail(email: string, orgId: string): Promise<User | null>;
  findByUsername(username: string, orgId: string): Promise<User | null>;
  findByStatus(status: string, orgId: string): Promise<User[]>;
  findByRole(roleId: string, orgId: string): Promise<User[]>;
  findActiveUsers(orgId: string): Promise<User[]>;
  findLockedUsers(orgId: string): Promise<User[]>;
  existsByEmail(email: string, orgId: string): Promise<boolean>;
  existsByUsername(username: string, orgId: string): Promise<boolean>;
  countByStatus(status: string, orgId: string): Promise<number>;
  findUsersWithFailedLogins(orgId: string, minFailedAttempts: number): Promise<User[]>;
}
