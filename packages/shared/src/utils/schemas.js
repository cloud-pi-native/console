/**
 * @param {object} schema Schema used for validation
 * @param {object} data Data to test
 * @returns {object} Validation error object
 */
export const schemaValidator = (schema, data, keysToValidate) => {
  const validation = schema.validate(data, { abortEarly: false }).error?.details || []
  return validation
    .filter((error) => keysToValidate ? keysToValidate.includes(error.context.key) : true)
    .reduce((acc, cur) => ({ ...acc, [cur.context.key]: cur.message }), {})
}

/**
 * @param {object} schema Schema used for validation
 * @param {object} data Data to test
 * @param {object} key Key to test
 * @returns {boolean} Is valid key
 */
export const isValid = (schema, data, key) => !schemaValidator(schema, data)[key]

/**
 * @param {object} model Schema that will be parse
 * @returns {object} Result parsed schema
 */
const parseJoi = (model) => Array.from(model.schema._ids._byKey)
  .reduce((acc, [key, value]) => ({ ...acc, [key]: instanciateSchema(value) }), {})

/**
 * @param {object} model Schema that will be convert
 * @returns {object} Result schema with all values set to true
 */
export const instanciateSchema = (model) => {
  if (model.schema?.type === 'object') {
    return parseJoi(model)
  }
  return model.schema?.type
    ? true
    : model
}
