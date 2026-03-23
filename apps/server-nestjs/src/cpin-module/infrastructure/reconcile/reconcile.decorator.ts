import { setTimeout } from 'node:timers/promises'
import { Logger } from '@nestjs/common'
import {
  DEFAULT_RECONCILE_ERROR_REQUEUE_AFTER_MS,
  DEFAULT_RECONCILE_MAX_RETRIES,
  DEFAULT_RECONCILE_REQUEUE_AFTER_MS,
} from './reconcile.constants'

export interface RequeueResult {
  requeueAfterMs?: number
}

export type ReconcileResult = undefined | RequeueResult

export function requeue(options: RequeueResult = {}): RequeueResult {
  return options
}

export interface ReconcileOptions {
  maxRetries?: number
  defaultRequeueAfterMs?: number
  defaultErrorRequeueAfterMs?: number
  shouldRetry?: (error: unknown) => boolean
  onError?: (error: unknown) => void
}

async function reconcile<T>(handler: () => Promise<T> | T, options: ReconcileOptions = {}): Promise<T> {
  const {
    maxRetries = DEFAULT_RECONCILE_MAX_RETRIES,
    defaultRequeueAfterMs = DEFAULT_RECONCILE_REQUEUE_AFTER_MS,
    defaultErrorRequeueAfterMs = DEFAULT_RECONCILE_ERROR_REQUEUE_AFTER_MS,
    shouldRetry,
    onError,
  } = options

  const run = async (attempt: number): Promise<T> => {
    try {
      const result = await handler()
      const requeueResult = toRequeueResult(result)

      if (requeueResult) {
        if (attempt >= maxRetries) return result
        const delayMs = Math.max(0, requeueResult.requeueAfterMs ?? defaultRequeueAfterMs)
        await setTimeout(delayMs)
        return await run(attempt + 1)
      }

      return result
    } catch (error) {
      onError?.(error)
      const canRetry = attempt < maxRetries && (shouldRetry?.(error) ?? true)
      if (!canRetry) throw error

      await setTimeout(Math.max(0, defaultErrorRequeueAfterMs))
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
  if (value && typeof value === 'object' && 'requeueAfterMs' in value) {
    const ms = (value as RequeueResult).requeueAfterMs
    return ms === undefined || typeof ms === 'number' ? { requeueAfterMs: ms } : undefined
  }
}
