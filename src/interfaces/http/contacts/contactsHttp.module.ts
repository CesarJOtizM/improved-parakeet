import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@auth/authentication.module';
import { ContactsModule } from '@contacts/contacts.module';
import { ContactsController } from './contacts.controller';

@Module({
  imports: [AuthenticationModule, ContactsModule],
  controllers: [ContactsController],
})
export class ContactsHttpModule {}
