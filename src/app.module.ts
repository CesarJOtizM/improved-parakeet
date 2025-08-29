import { AuthenticationModule } from '@auth/authentication.module';
import authConfig from '@auth/config/auth.config';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { HealthCheckModule } from '@interface/http/healthCheck/healthCheck.module';
import { ClientIpMiddleware } from '@interface/http/middlewares/clientIpMiddleware';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
