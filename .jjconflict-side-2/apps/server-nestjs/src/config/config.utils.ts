import z from 'zod'

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
