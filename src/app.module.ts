import { AuthenticationModule } from '@auth/authentication.module';
import authConfig from '@auth/config/auth.config';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { HealthCheckModule } from '@interface/http/healthCheck/healthCheck.module';
import { ImportHttpModule } from '@interface/http/import/importHttp.module';
import { InventoryHttpModule } from '@interface/http/inventory/inventoryHttp.module';
import { ClientIpMiddleware } from '@interface/http/middlewares/clientIpMiddleware';
import { ReturnsHttpModule } from '@interface/http/returns/returnsHttp.module';
import { SalesHttpModule } from '@interface/http/sales/salesHttp.module';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrganizationModule } from '@organization/organization.module';
import { SecurityMiddleware } from '@shared/middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        authConfig, // Cargar configuración de autenticación
      ],
    }),
    PrismaModule,
    HealthCheckModule,
    AuthenticationModule,
    OrganizationModule,
    InventoryHttpModule,
    SalesHttpModule,
    ReturnsHttpModule,
    ImportHttpModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ClientIpMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });

    consumer.apply(SecurityMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
