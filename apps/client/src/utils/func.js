import { useSnackbarStore } from '@/stores/snackbar.js'

const snackbarStore = useSnackbarStore()

export const copyContent = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    snackbarStore.setMessage('Donnée copié', 'success')
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}
