import { NodeSDK } from '@opentelemetry/sdk-node'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics'
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core'

function createSdk() {
  return new NodeSDK({
    traceExporter: new ConsoleSpanExporter(),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new ConsoleMetricExporter(),
    }),
    instrumentations: [getNodeAutoInstrumentations(), new NestInstrumentation()],
  })
}

export function start() {
  const sdk = createSdk()
  sdk.start()
  process.on('SIGTERM', () => {
    sdk.shutdown()
  })
}

start()
