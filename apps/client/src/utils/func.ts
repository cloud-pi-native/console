import { useSnackbarStore } from '@/stores/snackbar.js'

export async function copyContent(content: string): Promise<void> {
  const snackbarStore = useSnackbarStore()
  try {
    await navigator.clipboard.writeText(content)
    snackbarStore.setMessage('Donnée copiée', 'success')
  } catch (error: any) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

export function toCodeComponent(value: string) {
  return {
    component: 'code',
    text: value,
    title: 'Copier la valeur',
    class: 'fr-text-default--info text-xs cursor-pointer',
    onClick: () => copyContent(value),
  }
}

const maxDescriptionLength = 60
export function truncateDescription(description: string) {
  let innerHTML: string

  if (description.length <= maxDescriptionLength) {
    innerHTML = description
  } else {
    const lastSpaceIndex = description.slice(0, maxDescriptionLength).lastIndexOf(' ')
    innerHTML = `${description.slice(0, lastSpaceIndex > 0 ? lastSpaceIndex : maxDescriptionLength)} ...`
  }

  return {
    id: 'description',
    'data-testid': 'description',
    component: 'span',
    open: false,
    title: description,
    innerHTML,
  }
}

export function clickInDialog(e?: MouseEvent | TouchEvent, fn?: () => void) {
  // @ts-ignore
  if (e && e.target?.tagName !== 'DIALOG') {
    return
  }
  fn?.()
}

function randomId() {
  String.fromCharCode(97)
  return (Array.from({ length: 6 })).map(() => String.fromCharCode(97 + Math.floor(Math.random() * 26)))
}
export function getRandomId(suffix?: string, prefix?: string) {
  return (prefix ? (`${prefix}-`) : '') + randomId() + (suffix ? (`-${suffix}`) : '')
}
