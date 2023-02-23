import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSnackbarStore = defineStore('snackbar', () => {
  const defaultTimeout = 6000
  const message = ref(undefined)
  const isOpen = ref(false)
  const type = ref('info')
  const timeoutId = ref(undefined)

  const setMessage = (errorMessage, errorType = 'info', timeout = defaultTimeout) => {
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

  const hideMessage = () => {
    isOpen.value = false
  }

  return {
    message,
    isOpen,
    type,
    timeoutId,
    setMessage,
    hideMessage,
  }
})
