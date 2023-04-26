export const dbKeysExcluded = { attributes: { exclude: ['updatedAt', 'createdAt'] } }

export const lowercaseFirstLetter = string => string.charAt(0).toLowerCase() + string.slice(1)

export const replaceNestedKeys = (obj, fn) => {
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
