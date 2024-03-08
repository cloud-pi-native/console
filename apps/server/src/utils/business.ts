import { type SharedSafeParseReturnType, parseZodError } from '@cpn-console/shared'
import { BadRequestError } from './errors.js'

export const validateSchema = (schemaValidation: SharedSafeParseReturnType) => {
  if (!schemaValidation.success) throw new BadRequestError(parseZodError(schemaValidation.error))
}
