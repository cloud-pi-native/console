export const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('default', { dateStyle: 'long' }).format(date)
}

export const formatDateTime = (dateTimeString: string) => {
  const date = new Date(dateTimeString)
  return new Intl.DateTimeFormat('default', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
