export const dbKeysExcluded = ['updatedAt', 'createdAt']

// TODO
// @ts-ignore supprimer cette fonction et utiliser des schémas zod où elle est utilisé
export function filterObjectByKeys(obj, keys) {
  return Object.fromEntries(
    Object.entries(obj)?.filter(([key, _value]) => keys.includes(key)),
  )
}
