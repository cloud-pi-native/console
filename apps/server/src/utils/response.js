const sendRes = (res, status, data) => res.status(status).send(data)

export const sendOk = (res, data) => sendRes(res, 200, data)

export const sendCreated = (res, data) => sendRes(res, 201, data)

export const sendBadRequest = (res, data) => sendRes(res, 400, data)

export const sendUnauthorized = (res, data) => sendRes(res, 401, data)

export const sendForbidden = (res, data) => sendRes(res, 403, data)

export const sendNotFound = (res, data) => sendRes(res, 404, data)

export const sendUnprocessableContent = (res, data) => sendRes(res, 422, data)

export const sendServerError = (res, data) => sendRes(res, 500, data)
