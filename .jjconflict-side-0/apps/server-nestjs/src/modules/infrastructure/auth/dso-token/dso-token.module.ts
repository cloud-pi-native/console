import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { DsoTokenService } from './dso-token.service'

@Module({
  imports: [DatabaseModule],
  providers: [DsoTokenService],
  exports: [DsoTokenService],
})
export class DsoTokenModule {}
