import { describe, expect, it } from 'vitest'
import z from 'zod'
import { csv, flag, nonEmpty, truthySchema } from './config.utils'

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

  describe('nonEmpty', () => {
    const schema = nonEmpty(z.string())

    it('trims and keeps a non-empty value', () => {
      expect(schema.parse('  value  ')).toBe('value')
    })

    it('maps empty/whitespace/missing to undefined', () => {
      expect(schema.parse('')).toBeUndefined()
      expect(schema.parse('   ')).toBeUndefined()
      expect(schema.parse(undefined)).toBeUndefined()
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
