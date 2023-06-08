import { parseISO } from 'date-fns'

export const getJSDateFromUtcIso = (dateUtcIso: string) => {
  return parseISO(dateUtcIso)
}
