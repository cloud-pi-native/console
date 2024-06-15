export const dbKeysExcluded = ['updatedAt', 'createdAt']

// @ts-ignore supprimer cette fonction et utiliser des schémas zod où elle est utilisé
export const filterObjectByKeys = (obj, keys) =>
  Object.fromEntries(
    Object.entries(obj)?.filter(([key, _value]) => keys.includes(key)),
  )
