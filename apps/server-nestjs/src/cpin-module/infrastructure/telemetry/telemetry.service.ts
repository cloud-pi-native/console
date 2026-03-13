import { Injectable, Logger } from '@nestjs/common'
import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core'
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'

function createSdk() {
  return new NodeSDK({
    traceExporter: new OTLPTraceExporter({}),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
    }),
    instrumentations: [
      getNodeAutoInstrumentations(),
      new NestInstrumentation(),
      new PinoInstrumentation(),
    ],
    serviceName: 'cloud-pi-native-console',
  })
}

@Injectable()
export class TelemetryService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(TelemetryService.name)

  private sdk: NodeSDK | undefined

  onModuleInit() {
    if (this.sdk) {
        this.logger.log('OpenTelemetry SDK already started')
        return
    }

    this.sdk = createSdk()
    try {
      this.sdk.start()
      this.logger.log('OpenTelemetry SDK started')
    } catch (error) {
      this.logger.error('Failed to start OpenTelemetry SDK', error)
    }
  }

  onApplicationShutdown(signal?: string) {
    if (!this.sdk) {
        this.logger.log('OpenTelemetry SDK not started')
        return
    }

    try {
      this.sdk.shutdown()
      this.logger.log(`OpenTelemetry SDK stopped${signal ? ` (${signal})` : ''}`)
    } catch (error) {
      this.logger.error('Failed to shutdown OpenTelemetry SDK', error)
    } finally {
      this.sdk = undefined
    }
  }
}
