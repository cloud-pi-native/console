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
    })

    it('keeps every seeded group /console/ prefixed and drops all readonly groups', () => {
      const input = generateProjectCreateInput(body, 'owner-id', 'my-project')
      const groups = input.roles.create.map(role => role.oidcGroup)

      expect(groups.length).toBeGreaterThan(0)
      for (const group of groups) {
        expect(group).toMatch(/^\/my-project\/console\//)
        expect(group).not.toContain('readonly')
      }
    })
  })
})
