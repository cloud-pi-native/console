import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Logger } from 'nestjs-pino'
import { MainModule } from './main.module'
import { ConfigurationService } from './modules/infrastructure/configuration/configuration.service'

async function bootstrap() {
  const app = await NestFactory.create(MainModule, { bufferLogs: true })

  app.useLogger(app.get(Logger))
  app.flushLogs()
  app.enableShutdownHooks()

  const config = app.get(ConfigurationService)

  // Setup swagger-ui route
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Console Cloud π Native')
    .setDescription('Description de l\' API Cloud π Native')
    .setVersion('1.0')
    .addTag('console')
    .build()
  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('swagger-ui-server-nestjs', app, documentFactory)

  await app.listen(config.port ?? 0)
}

bootstrap()
