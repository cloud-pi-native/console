import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'
import type { ErrorTypes } from '@cpn-console/shared'

export const useSnackbarStore = defineStore('snackbar', () => {
  const defaultTimeout: number = 6000
  const message: Ref<string | undefined> = ref(undefined)
  const isOpen: Ref<boolean> = ref(false)
  const type: Ref<ErrorTypes> = ref('info')
  const timeoutId: Ref<ReturnType<typeof setTimeout> | undefined> = ref(undefined)
  const isWaitingForResponse = ref<boolean>(false)

  const hideMessage = () => {
    isOpen.value = false
    clearTimeout(timeoutId.value)
    timeoutId.value = undefined
  }

  const setMessage = (errorMessage: string, errorType: ErrorTypes = 'info', timeout: number = defaultTimeout) => {
    if (timeoutId.value) {
      clearTimeout(timeoutId.value)
      timeoutId.value = undefined
    }
    if (errorType !== 'error') {
      timeoutId.value = setTimeout(() => hideMessage(), timeout)
    }
    message.value = errorMessage
    isOpen.value = true
    type.value = errorType
  }

  return {
    message,
    isOpen,
    type,
    timeoutId,
    isWaitingForResponse,
    setMessage,
    hideMessage,
  }
})
