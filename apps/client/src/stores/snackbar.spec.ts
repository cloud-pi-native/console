import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { type MessagesType, type MessageType, useSnackbarStore } from './snackbar.js'

vi.spyOn(apiClient, 'get')
vi.spyOn(apiClient, 'post')
vi.spyOn(apiClient, 'put')
vi.spyOn(apiClient, 'patch')
vi.spyOn(apiClient, 'delete')

const getLastMessage = (store: MessagesType): MessageType => {
  const maxTimestamp = Math.max(...Object.keys(store).map(key => Number(key)))
  return store[maxTimestamp]
}

const checkStoreIsEmpty = (store: MessagesType) => {
  expect(Object.values(store).length).toEqual(0)
}

describe('Counter Store', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should display message in snackbar with default values', () => {
    const snackbarStore = useSnackbarStore()

    expect(snackbarStore.messages).toMatchObject({})

    const message = 'this is a message'
    snackbarStore.setMessage(message)

    const lastMessage = getLastMessage(snackbarStore.messages)
    expect(lastMessage.text).toEqual(message)
    expect(lastMessage.isDisplayed).toEqual(true)
    expect(lastMessage.type).toEqual('info')
    expect(lastMessage.timeout).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)

    vi.advanceTimersByTime(6000)

    expect(snackbarStore.messages).toMatchObject({})
    expect(vi.getTimerCount()).toEqual(0)
  })

  it('Should display message in snackbar with custom timer', () => {
    const snackbarStore = useSnackbarStore()

    checkStoreIsEmpty(snackbarStore.messages)

    const message = 'this is a message'
    snackbarStore.setMessage(message, 'info', 10000)

    const lastMessage = getLastMessage(snackbarStore.messages)
    expect(lastMessage.text).toEqual(message)
    expect(lastMessage.isDisplayed).toEqual(true)
    expect(lastMessage.type).toEqual('info')
    expect(lastMessage.timeout).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)

    vi.advanceTimersByTime(6000)

    expect(lastMessage.timeout).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)

    vi.advanceTimersByTime(4000)

    checkStoreIsEmpty(snackbarStore.messages)
    expect(vi.getTimerCount()).toEqual(0)
  })

  it('Should display message in snackbar with custom type', () => {
    const snackbarStore = useSnackbarStore()

    checkStoreIsEmpty(snackbarStore.messages)

    const message = 'this is a message'
    const type = 'warning'
    snackbarStore.setMessage(message, type)

    const lastMessage = getLastMessage(snackbarStore.messages)
    expect(lastMessage.text).toEqual(message)
    expect(lastMessage.isDisplayed).toEqual(true)
    expect(lastMessage.type).toEqual(type)
    expect(lastMessage.timeout).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)
  })

  // On veut absolument garder ce comportement,
  // ce ne serait pas plutôt aux fonctions appelantes qui envoi un type error de définir un grand timeout
  it.skip('Should display message in snackbar and don\'t hide it if type error', () => {
    const snackbarStore = useSnackbarStore()

    checkStoreIsEmpty(snackbarStore.messages)

    const message = 'this is a message'
    const type = 'error'
    snackbarStore.setMessage(message, type)

    const lastMessage = getLastMessage(snackbarStore.messages)
    expect(lastMessage.text).toEqual(message)
    expect(lastMessage.isDisplayed).toEqual(true)
    expect(lastMessage.type).toEqual(type)
    expect(lastMessage.timeout).toBeUndefined()
    expect(vi.getTimerCount()).toEqual(0)
  })

  it('Should display message in snackbar with custom type', () => {
    const snackbarStore = useSnackbarStore()

    checkStoreIsEmpty(snackbarStore.messages)

    const message1 = 'this is a message'
    const type1 = 'warning'
    snackbarStore.setMessage(message1, type1)

    const lastMessage = getLastMessage(snackbarStore.messages)
    expect(lastMessage.text).toEqual(message1)
    expect(lastMessage.isDisplayed).toEqual(true)
    expect(lastMessage.type).toEqual(type1)
    expect(lastMessage.timeout).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)

    const message2 = 'this is another message'
    const type2 = 'info'
    snackbarStore.setMessage(message2, type2)

    const lastMessage2 = getLastMessage(snackbarStore.messages)
    expect(lastMessage2.text).toEqual(message2)
    expect(lastMessage2.isDisplayed).toEqual(true)
    expect(lastMessage2.type).toEqual(type2)
    expect(lastMessage2.timeout).toBeDefined()
    expect(vi.getTimerCount()).toEqual(2)
  })

  it('Should hide message in snackbar', () => {
    const snackbarStore = useSnackbarStore()

    checkStoreIsEmpty(snackbarStore.messages)

    const message = 'this is a message'
    snackbarStore.setMessage(message, 'info', 1000)

    const lastMessage = getLastMessage(snackbarStore.messages)
    expect(lastMessage.text).toEqual(message)
    expect(lastMessage.isDisplayed).toEqual(true)
    expect(lastMessage.type).toEqual('info')
    expect(lastMessage.timeout).toBeDefined()
    expect(vi.getTimerCount()).toEqual(1)

    snackbarStore.hide(lastMessage)

    vi.advanceTimersByTime(100)
    expect(lastMessage.isDisplayed).toEqual(false)
    expect(lastMessage.timeout).toBeDefined()
    expect(vi.getTimerCount()).toEqual(2)

    vi.advanceTimersByTime(1000)
    checkStoreIsEmpty(snackbarStore.messages)
  })
})
