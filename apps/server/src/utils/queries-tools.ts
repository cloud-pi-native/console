// export const dbKeysExcluded = { attributes: { exclude: ['updatedAt', 'createdAt'] } }
export const dbKeysExcluded = ['updatedAt', 'createdAt']

export const lowercaseFirstLetter = string => string.charAt(0).toLowerCase() + string.slice(1)

export const replaceNestedKeys = (obj: any, fn: (key: string) => any) => {
  if (Array.isArray(obj)) {
    obj.forEach(el => replaceNestedKeys(el, fn))
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
    Object.entries(obj)
      ?.filter(([key, _value]) =>
        keys.includes(key)),
  )

// Export keys from result queries
export function exclude (user, keys) {
  return Object.fromEntries(
    Object.entries(user).filter(([key]) => !keys.includes(key)),
  )
}
