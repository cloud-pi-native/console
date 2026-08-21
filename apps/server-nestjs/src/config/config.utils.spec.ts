import { describe, expect, it } from 'vitest'
import z from 'zod'
import { csv, flag, truthySchema, urlSchema } from './config.utils'

describe('config.utils', () => {
  describe('flag', () => {
    it('coerces true/1 (case-insensitive) to true', () => {
      const schema = flag(truthySchema.default('false'))
      expect(schema.parse('true')).toBe(true)
      expect(schema.parse('1')).toBe(true)
      expect(schema.parse('TRUE')).toBe(true)
    })

    it('coerces false/0 to false', () => {
      const schema = flag(truthySchema.default('true'))
      expect(schema.parse('false')).toBe(false)
      expect(schema.parse('0')).toBe(false)
    })

    it('falls back to the schema default when missing', () => {
      expect(flag(truthySchema.default('false')).parse(undefined)).toBe(false)
      expect(flag(truthySchema.default('true')).parse(undefined)).toBe(true)
    })
  })

  describe('urlSchema', () => {
    it('normalizes and strips the trailing slash', () => {
      expect(urlSchema.parse('https://gitlab.internal/')).toBe('https://gitlab.internal')
      expect(urlSchema.parse('HTTPS://GITLAB.INTERNAL:443')).toBe('https://gitlab.internal')
    })

    it('keeps path segments and rejects invalid urls', () => {
      expect(urlSchema.parse('https://gitlab.internal/api/')).toBe('https://gitlab.internal/api')
      expect(() => urlSchema.parse('not-a-url')).toThrow()
    })
  })

  describe('csv', () => {
    const schema = csv(z.string())

    it('splits, trims and drops empty parts', () => {
      expect(schema.parse('a, b ,,c')).toEqual(['a', 'b', 'c'])
    })

    it('maps missing/empty to an empty array', () => {
      expect(schema.parse(undefined)).toEqual([])
      expect(schema.parse('')).toEqual([])
    })
  })
})
