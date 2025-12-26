import { Module } from '@nestjs/common';
import { ReturnsModule } from '@returns/returns.module';

import { ReturnsController } from './returns.controller';

@Module({
  imports: [ReturnsModule],
  controllers: [ReturnsController],
  exports: [ReturnsController],
})
export class ReturnsHttpModule {}
