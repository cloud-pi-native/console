import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const loggedIn = ref(undefined)
  const setLoggedIn = (isLoggedIn) => {
    loggedIn.value = isLoggedIn
  }
  return { loggedIn, setLoggedIn }
})
