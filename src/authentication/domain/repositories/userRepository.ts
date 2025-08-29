import type { User } from '@auth/domain/entities/user.entity';

export interface UserRepository {
  findById(id: string, orgId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string, orgId: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string, orgId: string): Promise<void>;
  exists(id: string, orgId: string): Promise<boolean>;
  findByOrganization(orgId: string): Promise<User[]>;
  findByRole(role: string, orgId: string): Promise<User[]>;
  findByStatus(status: string, orgId: string): Promise<User[]>;
}
