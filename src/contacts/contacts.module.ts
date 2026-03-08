import { Module } from '@nestjs/common';
import { PrismaContactRepository } from '@infrastructure/database/repositories/contact.repository';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { CreateContactUseCase } from '@application/contactUseCases/createContactUseCase';
import { GetContactsUseCase } from '@application/contactUseCases/getContactsUseCase';
import { GetContactByIdUseCase } from '@application/contactUseCases/getContactByIdUseCase';
import { UpdateContactUseCase } from '@application/contactUseCases/updateContactUseCase';
import { DeleteContactUseCase } from '@application/contactUseCases/deleteContactUseCase';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'ContactRepository',
      useClass: PrismaContactRepository,
    },
    CreateContactUseCase,
    GetContactsUseCase,
    GetContactByIdUseCase,
    UpdateContactUseCase,
    DeleteContactUseCase,
  ],
  exports: [
    CreateContactUseCase,
    GetContactsUseCase,
    GetContactByIdUseCase,
    UpdateContactUseCase,
    DeleteContactUseCase,
    'ContactRepository',
  ],
})
export class ContactsModule {}
