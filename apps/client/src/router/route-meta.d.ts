import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** French page title, used for `document.title` and the live announcement. */
    title?: string
  }
}

export {}
