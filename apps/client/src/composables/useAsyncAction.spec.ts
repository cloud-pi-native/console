import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useAsyncAction } from './useAsyncAction.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAsyncAction', () => {
  it('exposes idle, then success with the resolved data', async () => {
    const action = useAsyncAction(async (value: number) => value * 2)

    expect(action.state.value).toBe('idle')
    expect(action.pending.value).toBe(false)

    const result = await action.run(21)

    expect(result).toEqual({ ok: true, data: 42 })
    expect(action.state.value).toBe('success')
    expect(action.data.value).toBe(42)
    expect(action.error.value).toBeUndefined()
    expect(action.pending.value).toBe(false)
  })

  it('exposes error and calls onError without rejecting', async () => {
    const onError = vi.fn()
    const action = useAsyncAction(
      async () => {
        throw new Error('Accès refusé')
      },
      { onError },
    )

    const result = await action.run()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toBe('Accès refusé')
    expect(action.state.value).toBe('error')
    expect(action.error.value?.message).toBe('Accès refusé')
    expect(onError).toHaveBeenCalledOnce()
  })

  it('normalises a non-Error rejection into an Error', async () => {
    const action = useAsyncAction(async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'boom'
    })

    const result = await action.run()

    expect(result.ok).toBe(false)
    expect(action.error.value).toBeInstanceOf(Error)
    expect(action.error.value?.message).toBe('boom')
  })

  it('ignores a second call while pending', async () => {
    const pendingAction = deferred<string>()
    const action = useAsyncAction(async () => pendingAction.promise)

    const first = action.run()
    const second = await action.run()

    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error.message).toBe('Une opération est déjà en cours.')

    pendingAction.resolve('done')
    await expect(first).resolves.toEqual({ ok: true, data: 'done' })
  })

  it('clears state on reset', async () => {
    const action = useAsyncAction(async () => 'value')
    await action.run()

    action.reset()

    expect(action.state.value).toBe('idle')
    expect(action.data.value).toBeUndefined()
    expect(action.error.value).toBeUndefined()
  })

  it('does not update state after its scope is disposed', async () => {
    const pendingAction = deferred<string>()
    const scope = effectScope()
    const action = scope.run(() => useAsyncAction(async () => pendingAction.promise))

    if (!action) throw new Error('Le scope aurait dû retourner la composition')

    const running = action.run()
    scope.stop()
    pendingAction.resolve('late')

    await expect(running).resolves.toEqual({ ok: true, data: 'late' })
    expect(action.state.value).toBe('pending')
    expect(action.data.value).toBeUndefined()
  })
})
