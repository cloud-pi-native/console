import { Module } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { ConfigurationModule } from '../configuration/configuration.module'
import { DatabaseHealthService } from './database-health.service'
import { DatabaseService } from './database.service'
import { PrismaService } from './prisma.service'

@Module({
  imports: [ConfigurationModule],
  providers: [HealthIndicatorService, DatabaseHealthService, DatabaseService, PrismaService],
  exports: [DatabaseHealthService, DatabaseService, PrismaService],
})
export class DatabaseModule {}
