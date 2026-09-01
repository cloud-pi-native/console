import { describe, expect, it, vi } from 'vitest'
import { makeGitbeakerRequestError } from './gitlab-testing.utils'
import { ensure, isCommitAlreadyApplied, isGitbeakerRace } from './gitlab.utils'

describe('isGitbeakerRace', () => {
  it('should match collision errors only', () => {
    expect(isGitbeakerRace(makeGitbeakerRequestError({ description: 'has already been taken', status: 400 }))).toBe(true)
    expect(isGitbeakerRace(makeGitbeakerRequestError({ description: 'Reference already exists', status: 400 }))).toBe(true)
    expect(isGitbeakerRace(makeGitbeakerRequestError({ description: '404 File Not Found', status: 404 }))).toBe(false)
    expect(isGitbeakerRace(makeGitbeakerRequestError({ description: 'Internal Server Error', status: 500 }))).toBe(false)
    expect(isGitbeakerRace(new Error('has already been taken'))).toBe(false)
  })
})

describe('isCommitAlreadyApplied', () => {
  it('should match name collisions and duplicate-commit 400s', () => {
    expect(isCommitAlreadyApplied(makeGitbeakerRequestError({ description: 'has already been taken', status: 400 }))).toBe(true)
    expect(isCommitAlreadyApplied(makeGitbeakerRequestError({ description: 'Internal Server Error', status: 400, statusText: 'Bad Request' }))).toBe(true)
    expect(isCommitAlreadyApplied(makeGitbeakerRequestError({ description: '404 File Not Found', status: 404 }))).toBe(false)
    expect(isCommitAlreadyApplied(makeGitbeakerRequestError({ description: 'Internal Server Error', status: 500 }))).toBe(false)
  })
})

describe('ensure', () => {
  it('should return the created value when create succeeds', async () => {
    const created = { id: 1 }
    await expect(ensure({ create: async () => created, reload: async () => undefined })).resolves.toBe(created)
  })

  it('should reload once on a create collision and never retry create', async () => {
    const existing = { id: 2 }
    const create = vi.fn(async () => {
      throw makeGitbeakerRequestError({ description: 'has already been taken', status: 400 })
    })
    const onCollision = vi.fn()
    const reload = vi.fn(async () => existing)

    await expect(ensure({ create, reload, onCollision })).resolves.toBe(existing)

    expect(create).toHaveBeenCalledOnce()
    expect(onCollision).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('should rethrow the original error when a collision finds nothing on reload', async () => {
    const error = makeGitbeakerRequestError({ description: 'has already been taken', status: 400 })
    await expect(ensure({ create: async () => { throw error }, reload: async () => undefined })).rejects.toBe(error)
  })

  it('should rethrow non-race errors without reloading', async () => {
    const error = makeGitbeakerRequestError({ description: 'Internal Server Error', status: 500 })
    const reload = vi.fn()

    await expect(ensure({ create: async () => { throw error }, reload })).rejects.toBe(error)

    expect(reload).not.toHaveBeenCalled()
  })
})
