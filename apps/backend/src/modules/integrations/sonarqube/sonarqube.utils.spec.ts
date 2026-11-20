import { HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { SonarqubeError } from './sonarqube-http-client.service'
import { ensure, isSonarqubeAlreadyExists, sonarProjectPropertiesFile } from './sonarqube.utils'

describe('sonarProjectPropertiesFile', () => {
  it('targets the project key with a quality-gate wait', () => {
    expect(sonarProjectPropertiesFile('my-key')).toEqual([
      'sonar.projectKey=my-key',
      'sonar.qualitygate.wait=true',
    ])
  })
})

describe('isSonarqubeAlreadyExists', () => {
  it('matches a 409 or an already/exists message', () => {
    expect(isSonarqubeAlreadyExists(new SonarqubeError('ClientError', 'conflict', { status: HttpStatus.CONFLICT }))).toBe(true)
    expect(isSonarqubeAlreadyExists(new SonarqubeError('ClientError', `User 'bob' already exists`, { status: 400 }))).toBe(true)
  })

  it('rejects other errors', () => {
    expect(isSonarqubeAlreadyExists(new SonarqubeError('ClientError', 'forbidden', { status: 403 }))).toBe(false)
    expect(isSonarqubeAlreadyExists(new Error('already exists'))).toBe(false)
    expect(isSonarqubeAlreadyExists(null)).toBe(false)
  })
})

describe('ensure', () => {
  it('returns the created value when create succeeds', async () => {
    const reload = vi.fn()

    await expect(ensure({ create: async () => 'created', reload })).resolves.toBe('created')

    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads once on a collision and never retries create', async () => {
    const error = new SonarqubeError('ClientError', 'already exists', { status: 409 })
    const create = vi.fn(async () => { throw error })
    const onCollision = vi.fn()
    const reload = vi.fn(async () => 'existing')

    await expect(ensure({ create, reload, onCollision })).resolves.toBe('existing')

    expect(create).toHaveBeenCalledOnce()
    expect(onCollision).toHaveBeenCalledWith(error)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('rethrows the original error when a collision finds nothing on reload', async () => {
    const error = new SonarqubeError('ClientError', 'already exists', { status: 409 })

    await expect(ensure({ create: async () => { throw error }, reload: async () => undefined })).rejects.toBe(error)
  })

  it('rethrows non-collision errors without reloading', async () => {
    const error = new SonarqubeError('ClientError', 'forbidden', { status: 403 })
    const reload = vi.fn()

    await expect(ensure({ create: async () => { throw error }, reload })).rejects.toBe(error)

    expect(reload).not.toHaveBeenCalled()
  })
})
