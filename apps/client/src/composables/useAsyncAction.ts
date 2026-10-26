import type { ComputedRef, ShallowRef } from 'vue'
import { computed, getCurrentScope, onScopeDispose, shallowRef } from 'vue'

/**
 * Explicit lifecycle of a single asynchronous user action.
 *
 * `run()` never rejects: it resolves to a discriminated result so callers do
 * not have to wrap every click handler in try/catch, and Vue does not report an
 * unhandled rejection when the user navigates away mid-flight.
 */
export type AsyncActionState = 'idle' | 'pending' | 'success' | 'error'

export type AsyncActionResult<T>
  = | { ok: true, data: T }
    | { ok: false, error: Error }

export interface AsyncActionOptions {
  /** Called once per failure, after `error` has been set. */
  onError?: (error: Error) => void
}

export interface AsyncAction<Args extends unknown[], T> {
  state: ShallowRef<AsyncActionState>
  pending: ComputedRef<boolean>
  error: ShallowRef<Error | undefined>
  data: ShallowRef<T | undefined>
  run: (...args: Args) => Promise<AsyncActionResult<T>>
  reset: () => void
}

const UNKNOWN_ERROR_MESSAGE = 'Une erreur inattendue est survenue.'
const ALREADY_PENDING_MESSAGE = 'Une opération est déjà en cours.'
const DISPOSED_MESSAGE = 'Le composant a été démonté avant la fin de l’opération.'

function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string' && value.trim()) return new Error(value)
  return new Error(UNKNOWN_ERROR_MESSAGE)
}

export function useAsyncAction<Args extends unknown[], T>(
  action: (...args: Args) => Promise<T>,
  options: AsyncActionOptions = {},
): AsyncAction<Args, T> {
  const state = shallowRef<AsyncActionState>('idle')
  const error = shallowRef<Error | undefined>(undefined)
  const data = shallowRef<T | undefined>(undefined)
  const pending = computed(() => state.value === 'pending')

  let disposed = false
  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true
    })
  }

  const reset = () => {
    if (disposed) return
    state.value = 'idle'
    error.value = undefined
    data.value = undefined
  }

  const run = async (...args: Args): Promise<AsyncActionResult<T>> => {
    if (disposed) {
      return { ok: false, error: new Error(DISPOSED_MESSAGE) }
    }
    if (state.value === 'pending') {
      return { ok: false, error: new Error(ALREADY_PENDING_MESSAGE) }
    }

    state.value = 'pending'
    error.value = undefined

    try {
      const result = await action(...args)
      if (!disposed) {
        data.value = result
        state.value = 'success'
      }
      return { ok: true, data: result }
    } catch (cause: unknown) {
      const failure = toError(cause)
      if (!disposed) {
        error.value = failure
        state.value = 'error'
        options.onError?.(failure)
      }
      return { ok: false, error: failure }
    }
  }

  return { state, pending, error, data, run, reset }
}
