import { cacheStores, EnvHttpProxyAgent, interceptors, setGlobalDispatcher } from 'undici'

// Undici's EnvHttpProxyAgent reads HTTP_PROXY / HTTPS_PROXY / NO_PROXY from the
// environment and routes per-URL. NO_PROXY supports `host:port` entries and `*`
// (never proxy). Replaces the old `HTTP_PROXY ? ProxyAgent : Agent` branch.
const base = new EnvHttpProxyAgent()

// Undici's cache interceptor follows RFC 7234:
// 1. Only GET/HEAD are cached (configurable via `methods`).
// 2. Cache-Control directives are obeyed (no-store, max-age, private, no-cache).
// 3. Heuristic caching (status 200 without explicit freshness) uses 10% of
//    time since Last-Modified if present.
// 4. Stale responses are served while revalidating in background when
//    `stale-while-revalidate` is present.
const client = base.compose(
  interceptors.cache({
    store: new cacheStores.SqliteCacheStore(),
    methods: ['GET', 'HEAD'],
  }),
)
setGlobalDispatcher(client)
