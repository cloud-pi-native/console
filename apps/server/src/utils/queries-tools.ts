export const dbKeysExcluded = ['updatedAt', 'createdAt']

export const filterObjectByKeys = (obj, keys) =>
  Object.fromEntries(
    Object.entries(obj)?.filter(([key, _value]) => keys.includes(key)),
  )

// Export keys from result queries
export const exclude = <T>(result: T, keys: string[]): T => {
  // @ts-ignore
  if (Array.isArray(result)) return result.map(item => exclude(item, keys))
  const newObj = {}
  Object.entries(result).forEach(([key, value]) => {
    if (keys.includes(key)) return
    if (Array.isArray(value)) {
      newObj[key] = value.map((val) => exclude(val, keys))
      return
    }
    if (value instanceof Object) {
      newObj[key] = exclude(value, keys)
      return
    }
    newObj[key] = value
  })
  return newObj as any
}
