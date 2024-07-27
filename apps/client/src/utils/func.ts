import { useSnackbarStore } from '@/stores/snackbar.js'

export const copyContent = async (content: string): Promise<void> => {
  const snackbarStore = useSnackbarStore()
  try {
    await navigator.clipboard.writeText(content)
    snackbarStore.setMessage('Donnée copiée', 'success')
  }
  catch (error: any) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

export const toCodeComponent = (value: string) => ({
  component: 'code',
  text: value,
  title: 'Copier la valeur',
  class: 'fr-text-default--info text-xs cursor-pointer',
  onClick: () => copyContent(value),
})

export const bts = (v: boolean) => v ? 'true' : 'false'
