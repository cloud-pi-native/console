import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { DatabaseHealthService } from './database-health.service'
import { DatabaseService } from './database.service'
import { PrismaService } from './prisma.service'

@Module({
  imports: [TerminusModule],
  providers: [DatabaseHealthService, DatabaseService, PrismaService],
  exports: [DatabaseHealthService, DatabaseService, PrismaService],
})
export class DatabaseModule {}
