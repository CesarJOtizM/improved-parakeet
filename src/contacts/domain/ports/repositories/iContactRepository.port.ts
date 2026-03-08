import { Contact } from '@contacts/domain/entities/contact.entity';
import { IReadRepository, IWriteRepository } from '@shared/ports/repositories';

export interface IContactRepository extends IReadRepository<Contact>, IWriteRepository<Contact> {
  findByIdentification(identification: string, orgId: string): Promise<Contact | null>;
  existsByIdentification(identification: string, orgId: string): Promise<boolean>;
  findByType(type: string, orgId: string): Promise<Contact[]>;
  countSales(contactId: string, orgId: string): Promise<number>;
}
