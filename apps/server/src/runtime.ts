import { Agent, cacheStores, interceptors, ProxyAgent, setGlobalDispatcher } from 'undici'

const base = process.env.HTTP_PROXY ? new ProxyAgent(process.env.HTTP_PROXY) : new Agent()
const client = base.compose(
  interceptors.cache({
    store: new cacheStores.MemoryCacheStore({
      maxSize: 100 * 1024 * 1024,
      maxCount: 1000,
      maxEntrySize: 5 * 1024 * 1024,
    }),
    methods: ['GET', 'HEAD'],
  }),
)
setGlobalDispatcher(client)
