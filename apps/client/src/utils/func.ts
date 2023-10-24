import { useSnackbarStore } from '@/stores/snackbar.js'

export const copyContent = async (content: string):Promise<void> => {
  const snackbarStore = useSnackbarStore()
  try {
    await navigator.clipboard.writeText(content)
    snackbarStore.setMessage('Donnée copié', 'success')
  } catch (error: any) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}
