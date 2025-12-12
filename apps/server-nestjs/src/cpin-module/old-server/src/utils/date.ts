import { parseISO } from 'date-fns'

export function getJSDateFromUtcIso(dateUtcIso: string) {
  return parseISO(dateUtcIso)
}
