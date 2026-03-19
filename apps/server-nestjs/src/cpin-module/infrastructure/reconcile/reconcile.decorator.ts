import { setTimeout } from 'node:timers/promises'
import { Logger } from '@nestjs/common'

export interface RequeueResult {
  requeueAfterMs?: number
  reason?: string
}

export type ReconcileResult = undefined | RequeueResult

export function requeue(options: RequeueResult = {}): RequeueResult {
  return options
}

export interface ReconcileOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  factor?: number
  jitter?: number
  shouldRetry?: (error: unknown) => boolean
  onError?: (error: unknown) => void
}

export async function reconcile<T>(handler: () => Promise<T> | T, options: ReconcileOptions = {}): Promise<T> {
  const {
    maxRetries = 5,
    initialDelayMs = 1000,
    maxDelayMs = 60_000,
    factor = 2,
    jitter = 0.2,
    shouldRetry,
    onError,
  } = options

  const run = async (attempt: number): Promise<T> => {
    try {
      const result = await handler()
      const requeueResult = toRequeueResult(result)

      if (requeueResult) {
        if (attempt >= maxRetries) return result
        const delayMs = Math.max(0, requeueResult.requeueAfterMs ?? computeBackoffDelayMs({
          attempt,
          initialDelayMs,
          maxDelayMs,
          factor,
          jitter,
        }))
        await setTimeout(delayMs)
        return await run(attempt + 1)
      }

      return result
    } catch (error) {
      onError?.(error)
      const canRetry = attempt < maxRetries && (shouldRetry?.(error) ?? true)
      if (!canRetry) throw error

      const delayMs = computeBackoffDelayMs({
        attempt,
        initialDelayMs,
        maxDelayMs,
        factor,
        jitter,
      })
      await setTimeout(delayMs)
      return await run(attempt + 1)
    }
  }

  return await run(0)
}

export type TypedMethodDecorator = <T extends (this: any, ...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => void

export function Reconcile(options: ReconcileOptions = {}): TypedMethodDecorator {
  return <T extends (this: any, ...args: any[]) => any>(
    _target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ): void => {
    const original = descriptor.value
    if (!original) return

    descriptor.value = (async function (this: ThisParameterType<T>, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
      const logger: Logger = this?.logger instanceof Logger
        ? this.logger
        : new Logger(this?.constructor?.name ?? 'Reconcile')

      try {
        return await reconcile(
          () => original.apply(this, args),
          options,
        ) as Awaited<ReturnType<T>>
      } catch (error) {
        logger.error(
          `Handler ${String(propertyKey)} failed permanently`,
          error instanceof Error ? error.stack : undefined,
        )
        throw error
      }
    }) as T
  }
}

function toRequeueResult(value: unknown): RequeueResult | undefined {
  if (!value || typeof value !== 'object') return undefined
  const keys = Object.keys(value)
  if (keys.length === 0) return undefined

  for (const key of keys) {
    if (key !== 'requeueAfterMs' && key !== 'reason') return undefined
  }

  const requeueAfterMs = (value as any).requeueAfterMs
  const reason = (value as any).reason

  if (requeueAfterMs !== undefined && typeof requeueAfterMs !== 'number') return undefined
  if (reason !== undefined && typeof reason !== 'string') return undefined

  return { requeueAfterMs, reason }
}

function computeBackoffDelayMs(options: {
  attempt: number
  initialDelayMs: number
  maxDelayMs: number
  factor: number
  jitter: number
}): number {
  const base = Math.min(options.maxDelayMs, options.initialDelayMs * (options.factor ** options.attempt))
  const jitter = options.jitter <= 0 ? 0 : (Math.random() * 2 - 1) * options.jitter
  return Math.max(0, Math.round(base * (1 + jitter)))
}
