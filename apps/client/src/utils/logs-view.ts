import type { LocationQuery } from 'vue-router'

export interface LogsViewState {
  page: number
  hideLogs: boolean
  hideLogDetails: boolean
}

const defaultLogsViewState: LogsViewState = { page: 0, hideLogs: false, hideLogDetails: false }

function firstQueryString(query: LocationQuery, key: string): string | undefined {
  const value = query[key]
  const first = Array.isArray(value) ? value[0] : value
  return first ?? undefined
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export function parseLogsViewQuery(query: LocationQuery): LogsViewState {
  const state = { ...defaultLogsViewState }
  const page = firstQueryString(query, 'page')
  if (page !== undefined) {
    const parsedPage = Number(page)
    if (Number.isInteger(parsedPage) && parsedPage >= 0) state.page = parsedPage
  }
  const hideLogs = parseBoolean(firstQueryString(query, 'hideLogs'))
  if (hideLogs !== undefined) state.hideLogs = hideLogs
  const hideLogDetails = parseBoolean(firstQueryString(query, 'hideLogDetails'))
  if (hideLogDetails !== undefined) state.hideLogDetails = hideLogDetails
  return state
}

export function serializeLogsViewState(state: LogsViewState): LocationQuery {
  const query: LocationQuery = {}
  if (state.page > 0) query.page = String(state.page)
  if (state.hideLogs) query.hideLogs = 'true'
  if (state.hideLogDetails) query.hideLogDetails = 'true'
  return query
}
