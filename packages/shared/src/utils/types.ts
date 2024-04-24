export type ErrorTypes = 'info' | 'warning' | 'error' | 'success'

export type UserProfile = {
  email: string,
  id: string,
  firstName: string,
  lastName: string,
  groups: string[],
}
