import { AuthenticationModule } from '@auth/authentication.module';
import { Module } from '@nestjs/common';
import { ReturnsModule } from '@returns/returns.module';

import { ReturnsController } from './returns.controller';

@Module({
  imports: [
    AuthenticationModule, // Import AuthenticationModule to access JwtAuthGuard, JwtService, etc.
    ReturnsModule,
  ],
  controllers: [ReturnsController],
})
export class ReturnsHttpModule {}
