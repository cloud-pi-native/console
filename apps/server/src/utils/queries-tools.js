export const getUniq = (res) => res?.length ? res[0] : false

export const dbKeysExcluded = { attributes: { exclude: ['updatedAt', 'createdAt', 'externalToken'] } }

export const lowercaseFirstLetter = string => string.charAt(0).toLowerCase() + string.slice(1)

export const replaceNestedKeys = (obj, fn) => {
  if (Array.isArray(obj)) {
    obj.map(el => replaceNestedKeys(el, fn))
  } else if (typeof obj === 'object') {
    for (const key in obj) {
      if (key.startsWith('_')) return
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
