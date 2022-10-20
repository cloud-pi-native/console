import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const loggedIn = ref(undefined)
  /**
   * @param {boolean} isLoggedIn
   */
  const setLoggedIn = (isLoggedIn) => {
    loggedIn.value = isLoggedIn
  }

  return { loggedIn, setLoggedIn }
})
