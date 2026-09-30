export function endOfToday() {
  const end = new Date()
  end.setUTCHours(23, 59, 59, 999)

  return end
}
