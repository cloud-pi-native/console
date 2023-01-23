export const getUniq = (res) => res?.length ? res[0] : false

export const allDataAttributes = { attributes: { exclude: ['updatedAt', 'createdAt', 'externalToken'] } }
