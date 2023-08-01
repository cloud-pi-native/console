import type { FastifyReply } from 'fastify'
import type { FastifyReplyType } from 'fastify/types/type-provider'

const sendRes = (res: FastifyReply, status: number, data: FastifyReplyType = undefined) => res.status(status).send(data)

export const sendOk = (res: FastifyReply, data: FastifyReplyType) => sendRes(res, 200, data)

export const sendCreated = (res: FastifyReply, data: FastifyReplyType) => sendRes(res, 201, data)

export const sendNoContent = (res: FastifyReply) => sendRes(res, 204)

export const sendBadRequest = (res: FastifyReply, data: FastifyReplyType) => sendRes(res, 400, data)

export const sendUnauthorized = (res: FastifyReply, data: FastifyReplyType) => sendRes(res, 401, data)

export const sendForbidden = (res: FastifyReply, data: FastifyReplyType) => sendRes(res, 403, data)

export const sendNotFound = (res: FastifyReply, data: FastifyReplyType) => sendRes(res, 404, data)

export const sendUnprocessableContent = (res: FastifyReply, data: FastifyReplyType) => sendRes(res, 422, data)

export const sendServerError = (res: FastifyReply, data: FastifyReplyType) => sendRes(res, 500, data)
