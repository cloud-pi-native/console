export const convertVars = (dictionary, vars) => Object.entries(vars.extra)
  .reduce((acc, [key, value]) => ({
    ...acc,
    [dictionary?.[key] ?? key]: value,
  }), {})

export const prepareEnv = (extraVars) => {
  const env = Object.entries(extraVars).map(([key, value]) => {
    return ['-e', `${key}=${Array.isArray(value) ? JSON.stringify(value) : value}`]
  }).flat(1)
  return env
}
