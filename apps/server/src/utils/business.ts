import { type SharedSafeParseReturnType, parseZodError } from '@cpn-console/shared'
import { BadRequest400 } from './controller.js'

export const validateSchema = (schemaValidation: SharedSafeParseReturnType) => {
  if (!schemaValidation.success) return new BadRequest400(parseZodError(schemaValidation.error))
}
