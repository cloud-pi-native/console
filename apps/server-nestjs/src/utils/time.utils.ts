export function daysAgoFromNow(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

export function endOfToday() {
  const end = new Date()
  end.setUTCHours(23, 59, 59, 999)

  return end
}
