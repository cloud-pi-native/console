import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { ConfigModule } from '@nestjs/config'
import { baseConfigFactory } from '../../../config/base.config'
import { DatabaseHealthService } from './database-health.service'
import { DatabaseService } from './database.service'
import { PrismaService } from './prisma.service'

@Module({
  imports: [TerminusModule, ConfigModule.forFeature(baseConfigFactory)],
  providers: [DatabaseHealthService, DatabaseService, PrismaService],
  exports: [DatabaseHealthService, DatabaseService, PrismaService],
})
export class DatabaseModule {}
