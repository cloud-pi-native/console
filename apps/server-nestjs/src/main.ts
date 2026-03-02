import { NestFactory } from '@nestjs/core'
import { Logger } from 'nestjs-pino'

import { ConfigurationService } from './cpin-module/infrastructure/configuration/configuration.service'
import { MainModule } from './main.module'

async function bootstrap() {
  const app = await NestFactory.create(MainModule, { bufferLogs: true })
  app.useLogger(app.get(Logger))
  app.flushLogs()
  const config = app.get(ConfigurationService)
  await app.listen(config.port ?? 0)
}
bootstrap()
