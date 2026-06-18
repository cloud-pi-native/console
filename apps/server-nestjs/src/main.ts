import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK, resources } from '@opentelemetry/sdk-node'
import { Logger } from 'nestjs-pino'
import { MainModule } from './main.module'
import { ConfigurationService } from './modules/infrastructure/configuration/configuration.service'

const SERVICE_NAME = 'console-pi-native-console'

const telemetry = new NodeSDK({
  traceExporter: new OTLPTraceExporter({}),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
      '@opentelemetry/instrumentation-pino': { enabled: true },
    }),
  ],
  resource: resources.resourceFromAttributes({
    'service.name': SERVICE_NAME,
  }),
})

async function bootstrap() {
  telemetry.start()

  const app = await NestFactory.create<NestFastifyApplication>(MainModule, new FastifyAdapter(), {
    bufferLogs: true,
  })

  app.useLogger(app.get(Logger))
  app.flushLogs()
  app.enableShutdownHooks()
  app.getHttpAdapter().getInstance().addHook('onClose', async () => {
    await telemetry.shutdown()
  })

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

  await app.listen(config.port, config.host)

  const serverUrl = await app.getUrl()
  const logger = app.get(Logger)
  logger.log(`NestJS server running on: ${serverUrl}`)
}

void bootstrap()
