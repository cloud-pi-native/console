import { describe, expect, it } from 'vitest'
import { generateClusterWhereInput } from './cluster-queries.utils'

describe('generateClusterWhereInput', () => {
  it('returns an empty where for anonymous listing', () => {
    expect(generateClusterWhereInput()).toEqual({})
    expect(generateClusterWhereInput(undefined)).toEqual({})
  })

  it('returns the four authorization OR arms for a user', () => {
    const userId = 'user-1'
    const where = generateClusterWhereInput(userId)

    expect(where.OR).toEqual([
      { privacy: 'public' },
      { projects: { some: { members: { some: { userId } } } } },
      { projects: { some: { ownerId: userId } } },
      { environments: { some: { project: { members: { some: { userId } } } } } },
    ])
  })
})
