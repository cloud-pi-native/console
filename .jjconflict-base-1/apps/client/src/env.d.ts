/// <reference types="vite-plugin-pwa/vue" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:pwa-register/vue' {
  import type { Ref } from 'vue'
  import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

  export type { RegisterSWOptions }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: Ref<boolean>
    offlineReady: Ref<boolean>
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}

declare module 'vue3-json-viewer' {
    import { AllowedComponentProps, App, Component, ComponentCustomProps, VNodeProps } from 'vue';

    interface JsonViewerProps {
        value: Record<string, unknown> | Array<any> | string | number | boolean;
        expanded: boolean;
        expandDepth: number;
        copyable: boolean | object;
        sort: boolean;
        boxed: boolean;
        theme: string; //"dark" | "light"
        previewMode: boolean;
        timeformat: (value: any) => string;
    }

    type JsonViewerType = JsonViewerProps & VNodeProps & AllowedComponentProps & ComponentCustomProps;
    const JsonViewer: Component<JsonViewerType>;
    export { JsonViewer };
    const def: { install: (app: App) => void };
    export default def;
}
