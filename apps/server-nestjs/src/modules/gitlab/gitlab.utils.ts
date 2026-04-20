export function generateUsername(email: string) {
  return email.split('@')[0] ?? email
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
