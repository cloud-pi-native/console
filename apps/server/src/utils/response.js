const sendRes = (res, status, data) => res.status(status).send(data)

export const send200 = (res, data) => sendRes(res, 200, data)

export const send201 = (res, data) => sendRes(res, 201, data)

export const send400 = (res, data) => sendRes(res, 400, data)

export const send401 = (res, data) => sendRes(res, 401, data)

export const send403 = (res, data) => sendRes(res, 403, data)

export const send404 = (res, data) => sendRes(res, 404, data)

export const send500 = (res, data) => sendRes(res, 500, data)