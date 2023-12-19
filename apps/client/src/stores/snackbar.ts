import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'
import { type ErrorTypes } from '@dso-console/shared'

const defaultTimeout: number = 6000

export interface MessageType {
  timeout: number
  text: string
  type: ErrorTypes
  timestamp: number
  isDisplayed: boolean
}

export type MessagesType = Record<number, MessageType>

export const useSnackbarStore = defineStore('snackbar', () => {
  const messages: Ref<MessagesType> = ref({})

  const setMessage = (errorMessage: string, errorType: ErrorTypes = 'info', timeout: number = defaultTimeout) => {
    const newMessage = {
      timeout,
      text: errorMessage,
      type: errorType,
      timestamp: (new Date()).valueOf(),
      isDisplayed: true,
    }
    messages.value[newMessage.timestamp] = newMessage
    setTimeout(() => {
      delete messages.value[newMessage.timestamp]
    }, newMessage.timeout)
  }

  const clearMessages = () => {
    messages.value = {}
  }

  const hide = (message: MessageType) => {
    message.isDisplayed = false
    setTimeout(() => {
      delete messages.value[message.timestamp]
    }, message.timeout)
  }

  return {
    messages,
    hide,
    setMessage,
    clearMessages,
  }
})
