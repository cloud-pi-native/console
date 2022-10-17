const sendRes = (res, status, message) => {
  if (typeof message === 'string') {
    return res.status(status).json({ message })
  }
  return res.status(status).json(message)
}

export const send200 = (res, message) => sendRes(res, 200, message)

export const send201 = (res, message) => sendRes(res, 201, message)

export const send400 = (res, message) => sendRes(res, 400, message)

export const send401 = (res, message) => sendRes(res, 401, message)

export const send403 = (res, message) => sendRes(res, 403, message)

export const send404 = (res, message) => sendRes(res, 404, message)

export const send500 = (res, message) => sendRes(res, 500, message)