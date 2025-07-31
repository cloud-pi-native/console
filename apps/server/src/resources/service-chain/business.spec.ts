import { faker } from '@faker-js/faker'
import axios from 'axios'
import type { Mock } from 'vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getServiceChainDetails, listServiceChains } from './business.ts'

vi.mock('axios')

const serviceChain = {
  id: faker.string.uuid(),
  state: faker.string.alpha(),
  success: faker.datatype.boolean(),
  validation_id: faker.string.uuid(),
  validated_by: faker.string.uuid(),
  version: faker.string.alpha(),
  pai: faker.string.alpha(),
  ref: faker.string.alpha(),
  payload: {
    location: faker.string.alpha(),
    targetAddress: faker.internet.ipv4(),
    PAI: faker.string.alpha(),
    projectId: faker.string.uuid(),
    env: faker.string.alpha(),
    network: faker.string.alpha(),
    commonName: faker.string.alpha(),
    subjectAlternativeName: faker.helpers.uniqueArray(
      faker.internet.domainName,
      3,
    ),
    redirect: faker.datatype.boolean(),
    antivirus: faker.datatype.boolean(),
    maxFileSize: faker.number.int(),
    websocket: faker.datatype.boolean(),
    ipWhiteList: faker.helpers.uniqueArray(faker.internet.ipv4, 5),
    sslOutgoing: faker.datatype.boolean(),
  },
  createat: faker.date.recent().toString(),
  updateat: faker.date.recent().toString(),
}

describe('test ServiceChain business logic', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listServiceChains', () => {
    it('should return a list of service chains', async () => {
      (axios.get as Mock).mockResolvedValue({ data: [serviceChain] })

      await listServiceChains()

      expect(axios.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('getServiceChainDetails', () => {
    it('should return a service chain details', async () => {
      (axios.get as Mock).mockResolvedValue({ data: serviceChain })

      await getServiceChainDetails(faker.string.uuid())

      expect(axios.get).toHaveBeenCalledTimes(1)
    })
  })
})
