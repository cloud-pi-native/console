import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { SERVICE_NAME } from './database.constants'
import { PrismaService } from './prisma.service'

@Injectable()
export class DatabaseHealthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(HealthIndicatorService) private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check() {
    const indicator = this.healthIndicator.check(SERVICE_NAME)
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return indicator.up()
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
