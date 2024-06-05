export const dbKeysExcluded = ['updatedAt', 'createdAt']

export const filterObjectByKeys = (obj: Record<string, any>, keys: string[]) =>
  Object.fromEntries(
    Object.entries(obj)?.filter(([key, _value]) => keys.includes(key)),
  )
