import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CpinModule } from './cpin-module/cpin.module';

@Module({
  imports: [CpinModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
