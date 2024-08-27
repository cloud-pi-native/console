import type { logContract } from '@cpn-console/shared'
import { getAllLogs } from '@/resources/queries-index.js'

export const getLogs = async ({ offset, limit }: typeof logContract.getLogs.query._type) => getAllLogs({ skip: offset, take: limit })
