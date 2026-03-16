import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import { PrismaService } from './prisma.service'

@Injectable()
export class DatabaseHealthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(HealthIndicatorService) private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key)
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
