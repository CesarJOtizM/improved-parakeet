import { Organization } from '@organization/domain/entities/organization.entity';
import { IReadRepository, IWriteRepository } from '@shared/domain/repository';

export interface IOrganizationRepository
  extends IReadRepository<Organization>,
    Omit<IWriteRepository<Organization>, 'save'> {
  findBySlug(slug: string): Promise<Organization | null>;
  findById(id: string): Promise<Organization | null>;
  findByDomain(domain: string): Promise<Organization | null>;
  findActiveOrganizations(): Promise<Organization[]>;
  existsBySlug(slug: string): Promise<boolean>;
  existsByDomain(domain: string): Promise<boolean>;
  countActiveOrganizations(): Promise<number>;
  save(organization: Organization, slug?: string, domain?: string): Promise<Organization>;
}
