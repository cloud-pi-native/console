import { Module } from '@nestjs/common';
import { CpinController } from './cpin/cpin.controller';
import { CpinService } from './cpin/cpin.service';

@Module({
  controllers: [CpinController],
  providers: [CpinService]
})
export class CpinModule {}
