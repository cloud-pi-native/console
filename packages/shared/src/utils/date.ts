export function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('default', { dateStyle: 'long' }).format(date)
}

export function formatDateTime(dateTimeString: string) {
  const date = new Date(dateTimeString)
  return new Intl.DateTimeFormat('default', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function tomorrowNoon() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + 1)
  date.setUTCHours(12, 0, 0, 0)
  return date
}

export function daysAgo(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

export function endOfToday() {
  const end = new Date()
  end.setUTCHours(23, 59, 59, 999)

  return end
}
