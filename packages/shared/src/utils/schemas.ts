import Joi from 'joi'

type Context = {
  key?: string,
  projectNameMaxLength?: number
}
type FullContext = {
  keysToValidate?: string[],
  context?: Context
}

/**
 * @param {object} schema Schema used for validation
 * @param {object} data Data to test
 * @param {object} [ctx] Object with list of keys to validate and context
 * @returns {object} Validation error object
*/
export const schemaValidator = (schema: Joi.Schema, data: Record<string, unknown> | undefined, { keysToValidate, context }: FullContext = {}): Record<string, Joi.ValidationError> => {
  const validation = schema.validate(data, { abortEarly: false, context }).error?.details || []
  return validation
    .filter((error) => keysToValidate && error.context?.key ? keysToValidate.includes(error.context.key) : true)
    .reduce((acc, cur) => ({ ...acc, [cur.context?.key || 'unknown']: cur.message }), {})
}

/**
 * @param {object} schema Schema used for validation
 * @param {object} data Data to test
 * @param {object} key Key to test
 * @param {object} [ctx] Object with list of keys to validate and context
 * @returns {boolean} Is valid key
 */
export const isValid = (schema: Joi.Schema, data: Record<string, unknown>, key: string, ctx?: Context) => !schemaValidator(schema, data, { context: ctx })[key]

/**
 * @param {object} model Schema that will be parse
 * @returns {object} Result parsed schema
 */
// @ts-ignore Joi will be replace by Zod
const parseJoi = (model, value) => Array.from(model.schema._ids._byKey)
  // @ts-ignore
  .reduce((acc: Record<string, any>, [key, val]) => ({ ...acc, [key]: instanciateSchema(val, value) }), {})

/**
 * @param {object} model Schema that will be convert
 * @param {any} value Value passed to each key
 * @returns {object} Result schema with all values set to true
 */
// @ts-ignore Joi will be replace by Zod
export const instanciateSchema = (model, value) => {
  if (model.schema?.type === 'object') {
    return parseJoi(model, value)
  }
  return model.schema?.type
    ? value
    : model
}
