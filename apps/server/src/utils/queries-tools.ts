export const dbKeysExcluded = ['updatedAt', 'createdAt']

export const filterObjectByKeys = (obj, keys) =>
  Object.fromEntries(
    Object.entries(obj)?.filter(([key, _value]) => keys.includes(key)),
  )
