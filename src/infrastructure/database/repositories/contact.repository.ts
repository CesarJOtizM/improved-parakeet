import { PrismaService } from '@infrastructure/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Contact } from '@contacts/domain/entities/contact.entity';
import { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';

@Injectable()
export class PrismaContactRepository implements IContactRepository {
  private readonly logger = new Logger(PrismaContactRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Contact | null> {
    try {
      const data = await this.prisma.contact.findFirst({ where: { id, orgId } });
      if (!data) return null;
      return Contact.reconstitute(
        {
          name: data.name,
          identification: data.identification,
          type: data.type,
          address: data.address || undefined,
          notes: data.notes || undefined,
          isActive: data.isActive,
        },
        data.id,
        data.orgId
      );
    } catch (error) {
      this.logger.error(
        `Error finding contact by ID: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Contact[]> {
    try {
      const data = await this.prisma.contact.findMany({
        where: { orgId },
        orderBy: { name: 'asc' },
      });
      return data.map(item =>
        Contact.reconstitute(
          {
            name: item.name,
            identification: item.identification,
            type: item.type,
            address: item.address || undefined,
            notes: item.notes || undefined,
            isActive: item.isActive,
          },
          item.id,
          item.orgId
        )
      );
    } catch (error) {
      this.logger.error(
        `Error finding all contacts: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.contact.count({ where: { id, orgId } });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking contact existence: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async save(contact: Contact): Promise<Contact> {
    try {
      const data = {
        name: contact.name,
        identification: contact.identification,
        type: contact.type,
        address: contact.address || null,
        notes: contact.notes || null,
        isActive: contact.isActive,
        orgId: contact.orgId,
      };

      const existing = await this.prisma.contact.findUnique({
        where: { id: contact.id },
      });

      if (existing) {
        const updated = await this.prisma.contact.update({
          where: { id: contact.id },
          data,
        });
        return Contact.reconstitute(
          {
            name: updated.name,
            identification: updated.identification,
            type: updated.type,
            address: updated.address || undefined,
            notes: updated.notes || undefined,
            isActive: updated.isActive,
          },
          updated.id,
          updated.orgId
        );
      }

      const created = await this.prisma.contact.create({
        data: { id: contact.id, ...data },
      });
      return Contact.reconstitute(
        {
          name: created.name,
          identification: created.identification,
          type: created.type,
          address: created.address || undefined,
          notes: created.notes || undefined,
          isActive: created.isActive,
        },
        created.id,
        created.orgId
      );
    } catch (error) {
      this.logger.error(`Error saving contact: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.contact.deleteMany({ where: { id, orgId } });
    } catch (error) {
      this.logger.error(
        `Error deleting contact: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByIdentification(identification: string, orgId: string): Promise<Contact | null> {
    try {
      const data = await this.prisma.contact.findFirst({
        where: { identification, orgId },
      });
      if (!data) return null;
      return Contact.reconstitute(
        {
          name: data.name,
          identification: data.identification,
          type: data.type,
          address: data.address || undefined,
          notes: data.notes || undefined,
          isActive: data.isActive,
        },
        data.id,
        data.orgId
      );
    } catch (error) {
      this.logger.error(
        `Error finding contact by identification: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async existsByIdentification(identification: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.contact.count({
        where: { identification, orgId },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking contact identification: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async findByType(type: string, orgId: string): Promise<Contact[]> {
    try {
      const data = await this.prisma.contact.findMany({
        where: { orgId, type },
        orderBy: { name: 'asc' },
      });
      return data.map(item =>
        Contact.reconstitute(
          {
            name: item.name,
            identification: item.identification,
            type: item.type,
            address: item.address || undefined,
            notes: item.notes || undefined,
            isActive: item.isActive,
          },
          item.id,
          item.orgId
        )
      );
    } catch (error) {
      this.logger.error(
        `Error finding contacts by type: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  async countSales(contactId: string, orgId: string): Promise<number> {
    try {
      return await this.prisma.sale.count({ where: { contactId, orgId } });
    } catch (error) {
      this.logger.error(
        `Error counting contact sales: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }
}
