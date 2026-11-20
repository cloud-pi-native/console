import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyToClipboard } from './clipboard.js'

const snackbar = { setMessage: vi.fn() }
const writeText = vi.fn()

afterEach(() => {
  vi.restoreAllMocks()
  snackbar.setMessage.mockClear()
  writeText.mockReset()
})

function stubClipboard() {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
}

describe('copyToClipboard', () => {
  it('confirms with a snackbar message when the clipboard write succeeds', async () => {
    stubClipboard()
    writeText.mockResolvedValue(undefined)

    await copyToClipboard('repo-id-1', snackbar)

    expect(writeText).toHaveBeenCalledWith('repo-id-1')
    expect(snackbar.setMessage).toHaveBeenCalledWith('Copié dans le presse-papiers')
    expect(snackbar.setMessage).toHaveBeenCalledTimes(1)
  })

  it('reports the failure through the snackbar when the clipboard write rejects', async () => {
    stubClipboard()
    writeText.mockRejectedValue(new Error('denied'))

    await copyToClipboard('repo-id-1', snackbar)

    expect(snackbar.setMessage).toHaveBeenCalledWith('denied', 'error')
    expect(snackbar.setMessage).toHaveBeenCalledTimes(1)
  })
})
