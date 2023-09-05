export const dbKeysExcluded = ['updatedAt', 'createdAt']

export const lowercaseFirstLetter = (string) =>
  string.charAt(0).toLowerCase() + string.slice(1)

export const replaceNestedKeys = (obj: any, fn: (key: string) => any) => {
  if (Array.isArray(obj)) {
    obj.forEach((el) => replaceNestedKeys(el, fn))
  } else if (typeof obj === 'object') {
    for (const key in obj) {
      if (key.startsWith('_')) continue
      const newKey = lowercaseFirstLetter(key)
      obj[newKey] = obj[key]
      if (key !== newKey) {
        delete obj[key]
      }
      replaceNestedKeys(obj[newKey], fn)
    }
  }
  return obj
}

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
