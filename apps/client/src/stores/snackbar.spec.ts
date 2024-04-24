import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSnackbarStore } from './snackbar.js'

describe('Snackbar Store', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should display message in snackbar with default values', () => {
    const snackbarStore = useSnackbarStore()

    expect(snackbarStore.message).toBeUndefined()
    expect(snackbarStore.isOpen).toEqual(false)
    expect(snackbarStore.type).toEqual('info')
    expect(snackbarStore.timeoutId).toBeUndefined()

    const message = 'this is a message'
    snackbarStore.setMessage(message)

    expect(snackbarStore.message).toEqual(message)
    expect(snackbarStore.isOpen).toEqual(true)
    expect(snackbarStore.type).toEqual('info')
    expect(snackbarStore.timeoutId).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)

    vi.advanceTimersByTime(6000)

    expect(snackbarStore.timeoutId).toBeUndefined()
    expect(vi.getTimerCount()).toEqual(0)
  })

  it('Should display message in snackbar with custom timer', () => {
    const snackbarStore = useSnackbarStore()

    expect(snackbarStore.message).toBeUndefined()
    expect(snackbarStore.isOpen).toEqual(false)
    expect(snackbarStore.type).toEqual('info')
    expect(snackbarStore.timeoutId).toBeUndefined()

    const message = 'this is a message'
    snackbarStore.setMessage(message, 'info', 10000)

    expect(snackbarStore.message).toEqual(message)
    expect(snackbarStore.isOpen).toEqual(true)
    expect(snackbarStore.type).toEqual('info')
    expect(snackbarStore.timeoutId).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)

    vi.advanceTimersByTime(6000)

    expect(snackbarStore.timeoutId).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)

    vi.advanceTimersByTime(4000)

    expect(snackbarStore.timeoutId).toBeUndefined()
    expect(vi.getTimerCount()).toEqual(0)
  })

  it('Should display message in snackbar with custom type', () => {
    const snackbarStore = useSnackbarStore()

    expect(snackbarStore.message).toBeUndefined()
    expect(snackbarStore.isOpen).toEqual(false)
    expect(snackbarStore.type).toEqual('info')
    expect(snackbarStore.timeoutId).toBeUndefined()

    const message = 'this is a message'
    const type = 'warning'
    snackbarStore.setMessage(message, type)

    expect(snackbarStore.message).toEqual(message)
    expect(snackbarStore.isOpen).toEqual(true)
    expect(snackbarStore.type).toEqual(type)
    expect(snackbarStore.timeoutId).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)
  })

  it('Should display message in snackbar and don\'t hide it if type error', () => {
    const snackbarStore = useSnackbarStore()

    expect(snackbarStore.message).toBeUndefined()
    expect(snackbarStore.isOpen).toEqual(false)
    expect(snackbarStore.type).toEqual('info')
    expect(snackbarStore.timeoutId).toBeUndefined()

    const message = 'this is a message'
    const type = 'error'
    snackbarStore.setMessage(message, type)

    expect(snackbarStore.message).toEqual(message)
    expect(snackbarStore.isOpen).toEqual(true)
    expect(snackbarStore.type).toEqual(type)
    expect(snackbarStore.timeoutId).toBeUndefined()
    expect(vi.getTimerCount()).toEqual(0)
  })

  it('Should display message in snackbar with custom type', () => {
    const snackbarStore = useSnackbarStore()

    expect(snackbarStore.message).toBeUndefined()
    expect(snackbarStore.isOpen).toEqual(false)
    expect(snackbarStore.type).toEqual('info')
    expect(snackbarStore.timeoutId).toBeUndefined()

    const message1 = 'this is a message'
    const type1 = 'warning'
    snackbarStore.setMessage(message1, type1)

    expect(snackbarStore.message).toEqual(message1)
    expect(snackbarStore.isOpen).toEqual(true)
    expect(snackbarStore.type).toEqual(type1)
    expect(snackbarStore.timeoutId).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)

    const message2 = 'this is another message'
    const type2 = 'info'
    snackbarStore.setMessage(message2, type2)

    expect(snackbarStore.message).toEqual(message2)
    expect(snackbarStore.isOpen).toEqual(true)
    expect(snackbarStore.type).toEqual(type2)
    expect(snackbarStore.timeoutId).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)
  })

  it('Should hide message in snackbar', () => {
    const snackbarStore = useSnackbarStore()

    expect(snackbarStore.message).toBeUndefined()
    expect(snackbarStore.isOpen).toEqual(false)
    expect(snackbarStore.type).toEqual('info')
    expect(snackbarStore.timeoutId).toBeUndefined()

    const message = 'this is a message'
    snackbarStore.setMessage(message)

    expect(snackbarStore.message).toEqual(message)
    expect(snackbarStore.isOpen).toEqual(true)
    expect(snackbarStore.type).toEqual('info')
    expect(snackbarStore.timeoutId).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)

    snackbarStore.hideMessage()

    expect(snackbarStore.isOpen).toEqual(false)
    expect(snackbarStore.timeoutId).toBeUndefined()
    expect(vi.getTimerCount()).toEqual(0)
  })
})
