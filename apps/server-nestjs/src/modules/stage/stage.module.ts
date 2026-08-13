import { Module } from '@nestjs/common'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { StageController } from './stage.controller'
import { StageService } from './stage.service'

@Module({
  imports: [DatabaseModule],
  controllers: [StageController],
  providers: [StageService],
  exports: [StageService],
})
export class StageModule {}
