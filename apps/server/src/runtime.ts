import { Agent, cacheStores, interceptors, ProxyAgent, setGlobalDispatcher } from 'undici'

const base = process.env.HTTP_PROXY ? new ProxyAgent(process.env.HTTP_PROXY) : new Agent()

// Undici’s cache interceptor follows RFC 7234:
// 1. Only GET/HEAD are cached (configurable via `methods`).
// 2. Cache-Control directives are obeyed:
//    - `no-store` → never cache
//    - `max-age`, `s-maxage`, `expires` → freshness lifetime
//    - `private` → skip if shared store
//    - `no-cache` → revalidate with ETag/Last-Modified
// 3. Heuristic caching (status 200 without explicit freshness)
//    uses 10 % of time since Last-Modified if present.
// 4. Stale responses are served while revalidating in background
//    when `stale-while-revalidate` is present.
const client = base.compose(
  interceptors.cache({
    store: new cacheStores.SqliteCacheStore(),
    methods: ['GET', 'HEAD'],
  }),
)
setGlobalDispatcher(client)
