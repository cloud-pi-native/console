import type { CreateProjectBody } from '@cpn-console/shared'
import { describe, expect, it } from 'vitest'
import { generateProjectCreateInput } from './project.utils'

function hasCreate<T>(value: unknown): value is { create: T[] } {
  return typeof value === 'object'
    && value !== null
    && 'create' in value
    && Array.isArray(value.create)
}

describe('generateProjectCreateInput', () => {
  it('donne au propriétaire le rôle Propriétaire réellement créé', () => {
    const data: CreateProjectBody = {
      name: 'Projet',
      limitless: false,
      hprodCpu: 1,
      hprodGpu: 0,
      hprodMemory: 1,
      prodCpu: 1,
      prodGpu: 0,
      prodMemory: 1,
    }
    const input = generateProjectCreateInput(data, 'owner-id', 'slug')

    if (!hasCreate<{ id?: string, name: string }>(input.roles)) throw new Error('roles.create manquant')
    if (!hasCreate<{ userId: string, roleIds: string[] }>(input.members)) throw new Error('members.create manquant')

    const ownerRole = input.roles.create.find(role => role.name === 'Propriétaire')
    expect(ownerRole?.id).toBeDefined()
    expect(input.members.create[0]?.roleIds).toEqual([ownerRole?.id])
  })
})
