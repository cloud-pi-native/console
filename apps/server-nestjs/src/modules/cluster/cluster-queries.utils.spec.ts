import { describe, expect, it } from 'vitest'
import { listClustersWhere } from './cluster-queries.utils'

describe('listClustersWhere', () => {
  it('returns an empty where for anonymous listing', () => {
    expect(listClustersWhere()).toEqual({})
    expect(listClustersWhere(undefined)).toEqual({})
  })

  it('returns the four authorization OR arms for a user', () => {
    const userId = 'user-1'
    const where = listClustersWhere(userId)

    expect(where.OR).toEqual([
      { privacy: 'public' },
      { projects: { some: { members: { some: { userId } } } } },
      { projects: { some: { ownerId: userId } } },
      { environments: { some: { project: { members: { some: { userId } } } } } },
    ])
  })
})
