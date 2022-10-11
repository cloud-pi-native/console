import { parseISO } from 'date-fns/fp'

export const getJSDateFromUtcIso = (dateUtcIso) => {
  return parseISO(dateUtcIso)
}