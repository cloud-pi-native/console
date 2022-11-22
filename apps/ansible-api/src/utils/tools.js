export const convertVars = (dictionary, vars) => Object.entries(vars.extra)
  .reduce((acc, [key, value]) => ({
    ...acc,
    [dictionary?.[key] ?? key]: value,
  }), {})
