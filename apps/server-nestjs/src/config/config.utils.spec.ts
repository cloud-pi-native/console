import { describe, expect, it } from 'vitest'
import z from 'zod'
import { cronSchema, csv, flag, truthySchema } from './config.utils'

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

  describe('csv', () => {
    const schema = csv(z.string())

    it('splits, trims and drops empty parts', () => {
      expect(schema.parse('a, b ,,c')).toEqual(['a', 'b', 'c'])
    })

    it('maps missing/empty to an empty array', () => {
      expect(schema.parse(undefined)).toEqual([])
      expect(schema.parse('')).toEqual([])
    })

    it('silently coerces null to [] but rejects non-string scalars', () => {
      // null → '' → [] (env-absent case); numbers/objects are type errors (zod string check)
      expect(schema.parse(null)).toEqual([])
      expect(() => schema.parse(123)).toThrow(z.ZodError)
    })

    it('validates each element against the element schema', () => {
      const restricted = csv(z.enum(['A', 'B']))
      expect(restricted.parse(' A ,, B ')).toEqual(['A', 'B'])
      expect(() => restricted.parse('A,C')).toThrow(z.ZodError)
    })

    it('handles oversized lists without choking', () => {
      const big = Array.from({ length: 5000 }, (_, i) => `item-${i}`).join(',')
      expect(schema.parse(big)).toHaveLength(5000)
    })
  })

  describe('truthySchema', () => {
    it('accepts only the four literal tokens', () => {
      for (const v of ['true', 'false', '1', '0']) expect(truthySchema.parse(v)).toBe(v)
      for (const v of ['TRUE', 'True', 'yes', '', 'on', '2']) expect(() => truthySchema.parse(v)).toThrow(z.ZodError)
    })
  })

  describe('flag strictness', () => {
    it('rejects non-string input instead of coercing', () => {
      expect(() => flag(truthySchema.default('true')).parse(true)).toThrow(z.ZodError)
      expect(() => flag(truthySchema.default('true')).parse(1)).toThrow(z.ZodError)
    })

    it('does not trim whitespace before matching', () => {
      expect(() => flag(truthySchema.default('true')).parse(' true')).toThrow(z.ZodError)
    })
  })

  describe('cronSchema', () => {
    const valid = [
      '* * * * * *',
      '0/5 * * * * *',
      '*/15 * * * * *',
      '0,15,30,45 * * * * ?',
      '0 0 12 ? * MON-FRI',
      '0 0 12 ? * mon-fri',
      '0 0 0 1 JAN-MAR/2 ?',
      '0 0 0 * * 7',
      '\t0\t0\t12\t*\t*\t?\n',
    ]
    it.each(valid)('accepts %j', (expr) => {
      expect(cronSchema.safeParse(expr).success).toBe(true)
    })

    const invalid = [
      '',
      '* * * * *',
      '* * * * * * *',
      '*/0 * * * * *',
      '60 * * * * *',
      '* 60 * * * *',
      '* * 24 * * *',
      '* * * 32 * *',
      '* * * * 13 *',
      '* * * * * 8',
      '59-0 * * * * *',
      'MON * * * * *',
      'JAN-MAR * * * * *',
      '*/x * * * * *',
      '5- * * * * *',
      // '?' is Quartz-only and must not appear in the seconds field
      '? ? ? ? ? ?',
      // ranges are single-dash numeric pairs, not free-form strings
      '-5-3 * * * * *',
      '1-5-10 * * * * *',
      // empty comma parts are malformed in any field
      '0,,30 * * * * *',
      '* ,,* * * * *',
      ',,, *,* *,* *,* *,* *,*',
      '0 0 0 ,,5 * *',
    ]
    it.each(invalid)('rejects %j', (expr) => {
      expect(cronSchema.safeParse(expr).success).toBe(false)
    })

    it('accepts Quartz ? in day-of-month and day-of-week fields', () => {
      expect(cronSchema.safeParse('0 0 0 ?,5 * *').success).toBe(true)
    })

    it('requires exactly six fields even when padded', () => {
      expect(cronSchema.safeParse('  *   *   *   *   *  ').success).toBe(false)
    })
  })
})
