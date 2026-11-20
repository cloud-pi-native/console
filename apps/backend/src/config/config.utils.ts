import z from 'zod'

// Harbor retention triggers use 6-field (seconds) Quartz cron expressions.
// Stdlib-only validation, expressed as a Zod schema (no external dependency).
// Months (field 4) and days-of-week (field 5) accept Quartz name tokens too.
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const
const DOW_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

const CRON_FIELD_BOUNDS: ReadonlyArray<readonly [number, number]> = [
  [0, 59], // seconds
  [0, 59], // minutes
  [0, 23], // hours
  [1, 31], // day of month
  [1, 12], // month
  [0, 7], // day of week (0 and 7 = Sunday)
]

function isNameToken(token: string, names: ReadonlyArray<string>): boolean {
  return names.includes(token.toUpperCase())
}

function isNameItem(item: string, field: number): boolean {
  if (field !== 4 && field !== 5) return false
  const names = field === 4 ? MONTH_NAMES : DOW_NAMES
  if (isNameToken(item, names)) return true
  if (item.includes('-')) {
    const [lo, hi] = item.split('-')
    return isNameToken(lo, names) && isNameToken(hi, names)
  }
  return false
}

function isRangeOrNumber(token: string, min: number, max: number): boolean {
  if (token.includes('-')) {
    const [lo, hi] = token.split('-').map(Number)
    return lo >= min && hi <= max && lo <= hi
  }
  const n = Number(token)
  return Number.isInteger(n) && n >= min && n <= max
}

function isCronItem(item: string, field: number): boolean {
  if (item === '*' || item === '?') return true
  if (isNameItem(item, field)) return true
  const [min, max] = CRON_FIELD_BOUNDS[field]
  const step = /^(.+)\/(\d+)$/.exec(item)
  if (step) {
    if (Number(step[2]) < 1) return false
    const base = step[1]
    if (base === '*' || base === '?') return true
    if (isNameItem(base, field)) return true
    return isRangeOrNumber(base, min, max)
  }
  return isRangeOrNumber(item, min, max)
}

export const cronSchema = z
  .string()
  .superRefine((value, ctx) => {
    const fields = value.trim().split(/\s+/)
    if (fields.length !== 6) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'cron must have 6 fields (seconds required)' })
      return
    }
    if (!fields.every((field, i) => field.split(',').every(part => isCronItem(part, i)))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid cron expression' })
    }
  })

// Shared truthy enum for flag(): 'true'/'false'/'1'/'0'.
export const truthySchema = z.enum(['true', 'false', '1', '0'])

// Boolean flag. Strictly takes a z string schema (e.g. truthySchema.default('true')).
// Lowercases, then coerces 'true'/'1' -> true, 'false'/'0' -> false.
// Missing value falls back to the schema's default.
export function flag(schema: z.ZodType<string, z.ZodTypeDef, unknown>) {
  return z
    .preprocess(
      val => (typeof val === 'string' ? val.toLowerCase() : val),
      schema,
    )
    .transform(val => val === 'true' || val === '1')
}

// Comma-separated string -> array of schema-validated, trimmed non-empty parts.
// Empty/missing -> []. Strictly takes a z string schema (applied per element).
export function csv<T extends z.ZodType<string, z.ZodTypeDef, unknown>>(schema: T) {
  return z
    .preprocess(
      val => (typeof val === 'string' ? val : val ?? ''),
      z.string().transform(value => value.split(',').map(part => part.trim()).filter(Boolean)),
    )
    .pipe(z.array(schema))
}
