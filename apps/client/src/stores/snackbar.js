import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSnackbarStore = defineStore('snackbar', () => {
  const defaultTimeout = 6000
  const message = ref(undefined)
  const show = ref(false)
  const type = ref('info')
  const timeoutId = ref(undefined)

  const setMessage = (message, type = 'info', timeout = defaultTimeout) => {
    console.log({ message, type, timeout })
    if (timeoutId.value) {
      clearTimeout(timeoutId.value)
      timeoutId.value = undefined
    }
    if (type !== 'error') {
      timeoutId.value = setTimeout(() => hideMessage(), timeout)
    }
    message.value = message
    show.value = true
    type.value = type
  }

  const hideMessage = () => {
    show.value = false
  }

  return {
    message,
    show,
    type,
    timeoutId,
    setMessage,
    hideMessage,
  }
})
