import { dumpDb } from './queries.js'

export const getDb = async () => await dumpDb()
