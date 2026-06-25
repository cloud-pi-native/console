export function generateUsername(email: string) {
  return email.split('@')[0] ?? email
}

export function generateName(firstName: string | null | undefined, lastName: string | null | undefined) {
  const first = firstName?.trim() ?? ''
  const last = lastName?.trim() ?? ''
  return `${first} ${last}`.trim()
}

export function customAttributesFilter(key: string, value: string) {
  return { [`custom_attributes[${key}]`]: value } as Record<string, string>
}

export function generateFullyQualifiedUsername(email: string) {
  return email.replace('@', '.')
}

export function generateUsernameCandidates(email: string) {
  return [
    generateUsername(email),
    generateFullyQualifiedUsername(email),
  ]
}
