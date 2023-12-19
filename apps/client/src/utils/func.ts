import { useSnackbarStore } from '@/stores/snackbar.js'

export const copyContent = async (content: string): Promise<void> => {
  const snackbarStore = useSnackbarStore()
  try {
    await navigator.clipboard.writeText(content)
    snackbarStore.setMessage('Donnée copiée', 'success', 3000)
  } catch (error: any) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

export const handleError = (error: unknown) => {
  const snackbarStore = useSnackbarStore()
  if (error instanceof Error) return snackbarStore.setMessage(error?.message, 'error')
  snackbarStore.setMessage('Une erreur inconnue est survenue.')
}
