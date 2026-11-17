import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { CreateDeploymentSourceSchema, UpdateDeploymentSourceSchema } from './deployment.js'

describe('createDeploymentSourceSchema', () => {
  const source = { type: 'git', repositoryId: faker.string.uuid() }
  const externalValuesRef = { ref: 'values', targetRevision: 'stable', repositoryId: faker.string.uuid() }

  it('parses internal value sources when external values are not used', () => {
    const parsed = CreateDeploymentSourceSchema.parse({
      ...source,
      useExternalValues: false,
      valueSources: [{ type: 'internal', path: 'values.yaml' }],
    })

    expect(parsed).toEqual({ ...source, useExternalValues: false, valueSources: [{ type: 'internal', path: 'values.yaml' }] })
  })

  it('parses several external value sources sharing the ref', () => {
    const parsed = CreateDeploymentSourceSchema.parse({
      ...source,
      useExternalValues: true,
      externalValuesRef,
      valueSources: [
        { type: 'external', path: 'staging/worker.yaml' },
        { type: 'internal', path: 'values.yaml' },
        { type: 'external', path: 'staging/secrets.yaml' },
      ],
    })

    expect(parsed).toMatchObject({ useExternalValues: true, externalValuesRef })
    expect(parsed.valueSources).toHaveLength(3)
  })

  it('rejects an external value source when external values are not used', () => {
    const result = CreateDeploymentSourceSchema.safeParse({
      ...source,
      useExternalValues: false,
      valueSources: [{ type: 'external', path: 'staging/worker.yaml' }],
    })

    expect(result.success).toBe(false)
  })

  it('rejects external values without a ref', () => {
    const result = CreateDeploymentSourceSchema.safeParse({ ...source, useExternalValues: true, valueSources: [] })

    expect(result.success).toBe(false)
  })

  it('rejects a source that does not say whether it uses external values', () => {
    const result = CreateDeploymentSourceSchema.safeParse({ ...source, valueSources: [] })

    expect(result.success).toBe(false)
  })

  it('rejects a ref without a name', () => {
    const result = CreateDeploymentSourceSchema.safeParse({
      ...source,
      useExternalValues: true,
      externalValuesRef: { ...externalValuesRef, ref: '' },
    })

    expect(result.success).toBe(false)
  })
})

describe('updateDeploymentSourceSchema', () => {
  it('keeps the ids of value sources to update', () => {
    const id = faker.string.uuid()
    const parsed = UpdateDeploymentSourceSchema.parse({
      type: 'git',
      repositoryId: faker.string.uuid(),
      useExternalValues: true,
      externalValuesRef: { ref: 'values', repositoryId: faker.string.uuid() },
      valueSources: [{ type: 'external', id, path: 'staging/worker.yaml' }],
    })

    expect(parsed.valueSources).toEqual([{ type: 'external', id, path: 'staging/worker.yaml' }])
  })
})
