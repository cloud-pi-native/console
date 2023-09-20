import { useSnackbarStore } from '@/stores/snackbar.js'

const snackbarStore = useSnackbarStore()

export const copyContent = async (content: string):Promise<void> => {
  try {
    await navigator.clipboard.writeText(content)
    snackbarStore.setMessage('Donnée copié', 'success')
  } catch (error: any) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}
