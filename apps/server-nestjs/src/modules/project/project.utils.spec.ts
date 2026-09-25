import { describe, expect, it } from 'vitest'
import { generateProjectCreateInput, generateSlug } from './project.utils'

describe('project.utils', () => {
  describe('generateSlug', () => {
    it('returns the prefix when free', () => {
      expect(generateSlug('my-project')).toBe('my-project')
    })

    it('suffixes colliding slugs', () => {
      expect(generateSlug('my-project', ['my-project', 'my-project-1'])).toBe('my-project-2')
    })
  })

  describe('generateProjectCreateInput', () => {
    const body = {
      name: 'My Project',
      limitless: false,
    } as never

    it('seeds the reader role with the /console/reader oidcGroup', () => {
      const input = generateProjectCreateInput(body, 'owner-id', 'my-project')

      const reader = input.roles.create.find(role => role.name === 'Lecture')
      expect(reader).toBeDefined()
      expect(reader.oidcGroup).toBe('/my-project/console/reader')
      expect(reader.oidcGroup).not.toContain('readonly')
    })

    it('seeds admin, devops and developer roles with /console prefixed groups', () => {
      const input = generateProjectCreateInput(body, 'owner-id', 'my-project')

      const groups = input.roles.create.map(role => role.oidcGroup)
      expect(groups).toEqual([
        '/my-project/console/admin',
        '/my-project/console/devops',
        '/my-project/console/developer',
        '/my-project/console/reader',
      ])
    })
  })
})
