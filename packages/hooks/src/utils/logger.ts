export const parseError = (error: unknown) => {
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
