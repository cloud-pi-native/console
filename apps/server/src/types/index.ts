import { FastifyRequest } from 'fastify/types/request'

export type EnhancedFastifyRequest = FastifyRequest & { session?: { user?: { id?: string, groups: string[] } } }

export type PluginResult = Record<string, unknown> & { status?: { result: 'OK', message?: string } | { result: 'KO', message: string } }
