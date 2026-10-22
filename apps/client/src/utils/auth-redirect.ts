const STORAGE_KEY = 'cpn-console-post-login-target'
const IGNORED_PATHS = new Set(['/login', '/logout'])

/**
 * Remembers where the user wanted to go before being sent to Keycloak.
 *
 * The router guard replaces the URL with `/login`, so `keycloak.login()` cannot
 * infer the original target from `window.location` anymore. Keeping it in
 * session storage survives the full-page redirect and is scoped to the tab.
 */
export function rememberPostLoginTarget(fullPath: string): void {
  const [pathname] = fullPath.split('?')
  if (!fullPath.startsWith('/') || IGNORED_PATHS.has(pathname)) return
  try {
    sessionStorage.setItem(STORAGE_KEY, fullPath)
  } catch {
    // Storage can be unavailable (private mode, quota): the user simply lands
    // on the home page, which is the previous behaviour.
  }
}

export function consumePostLoginTarget(): string | undefined {
  try {
    const target = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    return target ?? undefined
  } catch {
    return undefined
  }
}
