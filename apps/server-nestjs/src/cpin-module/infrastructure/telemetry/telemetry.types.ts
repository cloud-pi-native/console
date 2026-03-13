import type { Attributes, Tracer, SpanOptions } from '@opentelemetry/api'

export const TELEMETRY_TRACER = Symbol('telemetry.tracer')

export const TELEMETRY_TRACER_NAME = 'cloud-pi-native-console'

export interface TelemetrySpanMetadata {
  options?: SpanOptions
  attributes?: Attributes
}

export type TelemetryTracer = Tracer
