/**
 * @param {*} value Value wanted to be return as is
 * @returns {*} Value returned as is
 */
export const identity = (value) => value

/**
 * @returns {Object} NewUser object
 */
export const initNewUser = () => ({
  id: undefined,
  email: undefined,
  firstName: undefined,
  lastName: undefined,
})
