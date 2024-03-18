export const parseError = (error: unknown) => {
  if (error instanceof Error) {
    Object.defineProperty(error, 'stack', {
      enumerable: true,
    })
    Object.defineProperty(error, 'message', {
      enumerable: true,
    })
  }
  return JSON.stringify(error)
}
