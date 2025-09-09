import { User } from '@auth/domain/entities/user.entity';
import { IReadRepository, IWriteRepository } from '@shared/domain/repository';

export interface IUserRepository extends IReadRepository<User>, IWriteRepository<User> {
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
