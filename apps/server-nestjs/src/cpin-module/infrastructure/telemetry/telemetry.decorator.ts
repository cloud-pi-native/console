import { SpanStatusCode, trace } from '@opentelemetry/api'
import type { Attributes, SpanOptions, Tracer } from '@opentelemetry/api'
import { TELEMETRY_TRACER_NAME } from './telemetry.constants'

export interface TelemetrySpanMetadata {
  options?: SpanOptions
  attributes?: Attributes
}

export function Span(name?: string, metadata: TelemetrySpanMetadata = {}): MethodDecorator {
  return (_target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const original = descriptor.value

    if (typeof original !== 'function') return descriptor

    descriptor.value = function (...args: any[]) {
      const tracer = trace.getTracer(TELEMETRY_TRACER_NAME)
      const spanName = name ?? `${this?.constructor?.name ?? 'Unknown'}.${String(propertyKey)}`

      return tracer.startActiveSpan(spanName, metadata.options ?? {}, (span) => {
        if (metadata.attributes) span.setAttributes(metadata.attributes)

        try {
          const result = original.apply(this, args)

          if (result instanceof Promise) {
            return result
              .catch((error: unknown) => {
                if (error instanceof Error) span.recordException(error)
                span.setStatus({ code: SpanStatusCode.ERROR })
                throw error
              })
              .finally(() => {
                span.end()
              })
          }

          return result
        } catch (error) {
          if (error instanceof Error) span.recordException(error)
          span.setStatus({ code: SpanStatusCode.ERROR })
          throw error
        } finally {
          span.end()
        }
      })
    }

    return descriptor
  }
}

export type { Attributes, SpanOptions, Tracer }
