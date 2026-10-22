/**
 * The four states every server-backed collection must distinguish before it
 * renders. Showing "empty" while the first request is still in flight is the
 * false-empty-state bug fixed in `DsoProjects`.
 */
export type CollectionViewState = 'loading' | 'error' | 'empty' | 'ready'

export function collectionViewState(params: {
  loading: boolean
  error?: Error | undefined
  count: number
}): CollectionViewState {
  if (params.loading) return 'loading'
  if (params.error) return 'error'
  return params.count > 0 ? 'ready' : 'empty'
}
