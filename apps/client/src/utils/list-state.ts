/**
 * The four states every server-backed collection must distinguish before it
 * renders. Showing "empty" while the first request is still in flight is the
 * false-empty-state bug (#2904): on a slow network a healthy list looks like a
 * permission or data problem.
 */
export type CollectionViewState = 'loading' | 'error' | 'empty' | 'ready'

const UNKNOWN_ERROR_MESSAGE = 'Erreur inattendue'

export function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string' && value.trim()) return new Error(value)
  return new Error(UNKNOWN_ERROR_MESSAGE)
}

export function collectionViewState(params: {
  loading: boolean
  error?: Error
  count: number
}): CollectionViewState {
  if (params.loading) return 'loading'
  if (params.error) return 'error'
  return params.count > 0 ? 'ready' : 'empty'
}
