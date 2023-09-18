import { removeTrailingSlash } from '@dso-console/shared'

export const vaultUrl = removeTrailingSlash(process.env.VAULT_URL)

export const vaultToken = process.env.VAULT_TOKEN
