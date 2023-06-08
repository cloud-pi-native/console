import type { FastifyReply } from 'fastify'

const sendRes = (res: FastifyReply, status: number, data: any) => res.status(status).send(data)

export const sendOk = (res: FastifyReply, data: any) => sendRes(res, 200, data)

export const sendCreated = (res: FastifyReply, data: any) => sendRes(res, 201, data)

export const sendBadRequest = (res: FastifyReply, data: any) => sendRes(res, 400, data)

export const sendUnauthorized = (res: FastifyReply, data: any) => sendRes(res, 401, data)

export const sendForbidden = (res: FastifyReply, data: any) => sendRes(res, 403, data)

export const sendNotFound = (res: FastifyReply, data: any) => sendRes(res, 404, data)

export const sendUnprocessableContent = (res: FastifyReply, data: any) => sendRes(res, 422, data)

export const sendServerError = (res: FastifyReply, data: any) => sendRes(res, 500, data)
