import type { ErrorTypes } from '@cpn-console/shared'
import { logger } from '@cpn-console/logger/browser'

interface Snackbar {
  setMessage: (message: string, errorType?: ErrorTypes) => void
}

export async function copyToClipboard(text: string, snackbar: Snackbar) {
  try {
    await navigator.clipboard.writeText(text)
    snackbar.setMessage('Copié dans le presse-papiers')
  } catch (err) {
    logger.error({ err }, 'Clipboard write failed')
    snackbar.setMessage(err instanceof Error ? err.message : String(err), 'error')
  }
}
