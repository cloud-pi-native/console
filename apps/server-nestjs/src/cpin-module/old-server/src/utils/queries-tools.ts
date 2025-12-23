export const dbKeysExcluded = ['updatedAt', 'createdAt']

// TODO
// @ts-ignore supprimer cette fonction et utiliser des schémas zod où elle est utilisé
export function filterObjectByKeys(obj, keys) {
  return Object.fromEntries(
    Object.entries(obj)?.filter(([key, _value]) => keys.includes(key)),
  )
}

export const uuid: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
