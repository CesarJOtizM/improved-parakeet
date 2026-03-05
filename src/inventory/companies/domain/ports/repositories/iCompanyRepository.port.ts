import { Company } from '@inventory/companies/domain/entities/company.entity';
import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';

export interface ICompanyRepository extends IReadRepository<Company>, IWriteRepository<Company> {
  findByCode(code: string, orgId: string): Promise<Company | null>;
  findByName(name: string, orgId: string): Promise<Company | null>;
  existsByCode(code: string, orgId: string): Promise<boolean>;
  existsByName(name: string, orgId: string): Promise<boolean>;
  countProducts(companyId: string, orgId: string): Promise<number>;
}
