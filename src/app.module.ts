import { AuthenticationModule } from '@auth/authentication.module';
import authConfig from '@auth/config/auth.config';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { HealthCheckModule } from '@interface/http/healthCheck/healthCheck.module';
import { ImportHttpModule } from '@interface/http/import/importHttp.module';
import { InventoryHttpModule } from '@interface/http/inventory/inventoryHttp.module';
import { ClientIpMiddleware } from '@interface/http/middlewares/clientIpMiddleware';
import { ContactsHttpModule } from '@interface/http/contacts/contactsHttp.module';
import { IntegrationsHttpModule } from '@interface/http/integrations/integrationsHttp.module';
import { DashboardHttpModule } from '@interface/http/dashboard/dashboardHttp.module';
import { ReturnsHttpModule } from '@interface/http/returns/returnsHttp.module';
import { SalesHttpModule } from '@interface/http/sales/salesHttp.module';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OrganizationModule } from '@organization/organization.module';
import { ReportModule } from '@report/report.module';
import { validate } from '@shared/config/env.validation';
import { ResponseInterceptor } from '@shared/interceptors/responseInterceptor';
import { SecurityMiddleware } from '@shared/middleware';
import { CorrelationIdMiddleware } from '@shared/middlewares/correlationId.middleware';

import { TenantMiddleware } from './interfaces/http/middlewares/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig],
      validate,
    }),
    PrismaModule,
    HealthCheckModule,
    AuthenticationModule,
    OrganizationModule,
    InventoryHttpModule,
    SalesHttpModule,
    ReturnsHttpModule,
    ImportHttpModule,
    ReportModule,
    DashboardHttpModule,
    ContactsHttpModule,
    IntegrationsHttpModule,
  ],
  controllers: [],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ResponseInterceptor }],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer.apply(ClientIpMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer.apply(SecurityMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'vtex/webhook/(.*)', method: RequestMethod.ALL }
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
