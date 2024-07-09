import { getAllLogs } from '@/resources/queries-index.js'
import { logContract } from '@cpn-console/shared'

export const getLogs = async ({ offset, limit }: typeof logContract.getLogs.query._type) => getAllLogs({ skip: offset, take: limit })
