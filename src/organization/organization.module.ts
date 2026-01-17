import { CreateOrganizationUseCase } from '@application/organizationUseCases/createOrganizationUseCase';
import { GetOrganizationByIdUseCase } from '@application/organizationUseCases/getOrganizationByIdUseCase';
import { AuthenticationModule } from '@auth/authentication.module';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OrganizationRepository } from '@infrastructure/database/repositories/organization.repository';
import { Module } from '@nestjs/common';
import { OrganizationController } from '@organization/organization.controller';

@Module({
  imports: [
    PrismaModule,
    AuthenticationModule, // Import AuthenticationModule to access DomainEventDispatcher
  ],
  controllers: [OrganizationController],
  providers: [
    CreateOrganizationUseCase,
    GetOrganizationByIdUseCase,
    {
      provide: 'OrganizationRepository',
      useClass: OrganizationRepository,
    },
  ],
  exports: ['OrganizationRepository'],
})
export class OrganizationModule {}
