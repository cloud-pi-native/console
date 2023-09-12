import type { FastifyReply } from 'fastify'
import type { FastifyReplyType } from 'fastify/types/type-provider'

const sendRes = (res: FastifyReply, status: number, data: FastifyReplyType = undefined) => res.status(status).send(data)

export const sendOk = (res: FastifyReply, data: FastifyReplyType) => sendRes(res, 200, data)

export const sendCreated = (res: FastifyReply, data: FastifyReplyType) => sendRes(res, 201, data)

export const sendNoContent = (res: FastifyReply) => sendRes(res, 204)
