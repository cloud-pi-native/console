export const parseError = (error: unknown) => {
  // @ts-ignore
  if (error?.config?.auth?.username) error.config.auth.username = 'MASKED'
  // @ts-ignore
  if (error?.config?.auth?.password) error.config.auth.password = 'MASKED'
  // @ts-ignore
  if (error?.config?.headers) error.config.headers = 'MASKED'
  if (error instanceof Error) {
    Object.defineProperty(error, 'stack', {
      enumerable: true,
    })
    Object.defineProperty(error, 'message', {
      enumerable: true,
    })
  }
  try {
    return JSON.stringify(error)
  } catch (parseError) {
    console.log(parseError)
    if (error instanceof Error && error.stack) {
      return `Can't parse error \n${error.stack}`
    }
    return error
  }
}
