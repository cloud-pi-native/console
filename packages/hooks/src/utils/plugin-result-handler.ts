import type { PluginResult, PluginResultStore, PluginResultStoreValue } from '@/hooks/hook.js'
import { parseError } from './logger.js'

export class PluginResultBuilder {
  private okMessages = [] as string[]
  private warnMessages = [] as string[]
  private koMessages = [] as string[]
  private extras: Record<string, any> = {}
  public store: PluginResultStore = {}

  constructor(okMessage: string | undefined) {
    if (okMessage) {
      this.okMessages.push(okMessage)
    }
  }

  addExtra(key: string, value: any) {
    this.extras[key] = value
    return this
  }

  addOkMessage(...messages: string[]) {
    this.koMessages.push(...messages)
    return this
  }

  addKoMessage(...messages: string[]) {
    this.koMessages.push(...messages)
    return this
  }

  addWarnMessage(...messages: string[]) {
    this.warnMessages.push(...messages)
    return this
  }

  setOkMessage(...messages: string[]) {
    this.koMessages = messages
    return this
  }

  setKoMessage(...messages: string[]) {
    this.koMessages = messages
    return this
  }

  setWarnMessage(...messages: string[]) {
    this.warnMessages = messages
    return this
  }

  setToStore(key: string, value: PluginResultStoreValue) {
    this.store[key] = value
  }

  deleteFromStore(key: string) {
    delete this.store[key]
  }

  returnUnexpectedError(error: unknown): PluginResult {
    this.addKoMessage('UnexpectedError')
    this.addExtra('error', parseError(error))
    return this.getResultObject()
  }

  getResultObject(): PluginResult {
    const result: PluginResult = {
      status: {
        result: 'OK',
        message: this.okMessages.join('\n') || undefined,
      },
      ...this.extras,
    }

    if (this.koMessages.length) {
      result.status = {
        result: 'KO',
        message: this.koMessages.join('\n'),
      }
    } else if (this.warnMessages.length) {
      result.status = {
        result: 'WARNING',
        message: this.warnMessages.join('\n'),
      }
    }

    if (Object.keys(this.store).length) {
      result.store = this.store
    }

    return result
  }
}
