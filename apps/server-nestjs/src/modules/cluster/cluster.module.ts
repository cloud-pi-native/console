import { Module } from '@nestjs/common'
import { DatabaseModule } from '../infrastructure/database/database.module'
import { ClusterController } from './cluster.controller'
import { ClusterService } from './cluster.service'

@Module({
  imports: [DatabaseModule],
  controllers: [ClusterController],
  providers: [ClusterService],
  exports: [ClusterService],
})
export class ClusterModule {}
