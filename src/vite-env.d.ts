/// <reference types="vite/client" />

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
  }): (reloadPage?: boolean) => Promise<void>
}

declare module 'virtual:pwa-register/react' {
  // @ts-expect-error ignore
  import type { Dispatch, SetStateAction } from 'react'
  // @ts-expect-error ignore
  import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

  export type RegisterSWHook = {
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>]
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }

  export function useRegisterSW(options?: RegisterSWOptions): RegisterSWHook
}

