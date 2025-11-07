import { useSnackbarStore } from '@/stores/snackbar.js'

const LOCALE = navigator.language.slice(0, 2)
// Get the thousands and decimal separator characters used in the locale.
const [,THOUSANDS_SEPARATOR,,,,DECIMAL_SEPARATOR] = 1111.1.toLocaleString(LOCALE)
// 0.1 number as local string to use in labels and placeholders
export const ONE_TENTH_STR = 0.1.toLocaleString()

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

/**
 * Replace current locale separators occurences before parsing a floating Number.
 * See https://stackoverflow.com/a/59679285
 * @param s String to parse
 * @returns Number
 */
export function localeParseFloat(s: string): number {
  // Remove thousand separators, and put a point where the decimal separator occurs
  const delocalizedInput = s.replaceAll(THOUSANDS_SEPARATOR, '').replaceAll(DECIMAL_SEPARATOR, '.')
  // Now it can be parsed
  return Number.parseFloat(delocalizedInput)
}
