import type {
  ServiceChain,
  ServiceChainDetails,
  ServiceChainFlows,
} from '@cpn-console/shared'
import {
  serviceChainEnvironmentEnum,
  serviceChainFlowStateEnum,
  serviceChainLocationEnum,
  serviceChainNetworkEnum,
  serviceChainStateEnum,
} from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import axios from 'axios'
import type { Mock } from 'vitest'
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'

import {
  getServiceChainDetails,
  listServiceChains,
  retryServiceChain,
  validateServiceChain,
  getServiceChainFlows,
} from './business.ts'

vi.mock('axios')

let serviceChain: ServiceChain
let serviceChainDetails: ServiceChainDetails
let serviceChainFlows: ServiceChainFlows

describe('test ServiceChain business logic', () => {
  beforeEach(() => {
    serviceChain = {
      id: faker.string.uuid(),
      state: faker.helpers.arrayElement(serviceChainStateEnum),
      commonName: `${faker.string.alpha(3)}.${faker.string.alpha(3)}.minint.fr`,
      pai: faker.string.alpha(3).toUpperCase(),
      network: faker.helpers.arrayElement(serviceChainNetworkEnum),
      createdAt: faker.date.recent(),
      updatedAt: faker.date.recent(),
    }

    serviceChainDetails = {
      ...serviceChain,
      validationId: faker.string.uuid(),
      validatedBy: faker.string.uuid(),
      ref: faker.string.uuid(),
      location: faker.helpers.arrayElement(serviceChainLocationEnum),
      targetAddress: faker.internet.ipv4(),
      projectId: faker.string.uuid(),
      env: faker.helpers.arrayElement(serviceChainEnvironmentEnum),
      subjectAlternativeName: faker.helpers.uniqueArray(
        faker.internet.domainName,
        3,
      ),
      redirect: faker.datatype.boolean(),
      antivirus:
        faker.helpers.maybe(() => ({
          maxFileSize: faker.number.int(),
        })) || null, // undefined is not wanted here
      websocket: faker.datatype.boolean(),
      ipWhiteList: faker.helpers
        .uniqueArray(faker.internet.ipv4, 5)
        .map(e => `${e}/32`), // We want a CIDR here
      sslOutgoing: faker.datatype.boolean(),
    }

    serviceChainFlows = {
      reserve_ip: {
        state: faker.helpers.arrayElement(serviceChainFlowStateEnum),
        input: '{ "foo": 0, "bar": true, "qux": "test" }',
        output: '{ "foo": 0, "bar": true, "qux": "test" }',
        updatedAt: faker.date.recent(),
      },
      create_cert: {
        state: faker.helpers.arrayElement(serviceChainFlowStateEnum),
        input: '{ "foo": 0, "bar": true, "qux": "test" }',
        output: '{ "foo": 0, "bar": true, "qux": "test" }',
        updatedAt: faker.date.recent(),
      },
      call_exec: {
        state: faker.helpers.arrayElement(serviceChainFlowStateEnum),
        input: '{ "foo": 0, "bar": true, "qux": "test" }',
        output: '{ "foo": 0, "bar": true, "qux": "test" }',
        updatedAt: faker.date.recent(),
      },
      activate_ip: {
        state: faker.helpers.arrayElement(serviceChainFlowStateEnum),
        input: '{ "foo": 0, "bar": true, "qux": "test" }',
        output: '{ "foo": 0, "bar": true, "qux": "test" }',
        updatedAt: faker.date.recent(),
      },
      dns_request: {
        state: faker.helpers.arrayElement(serviceChainFlowStateEnum),
        input: '{ "foo": 0, "bar": true, "qux": "test" }',
        output: '{ "foo": 0, "bar": true, "qux": "test" }',
        updatedAt: faker.date.recent(),
      },
    }
  })

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
      (axios.get as Mock).mockResolvedValue({ data: serviceChainDetails })

      await getServiceChainDetails(faker.string.uuid())

      expect(axios.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('retryServiceChain', () => {
    it('should trigger a service chain retry attempt', async () => {
      (axios.post as Mock).mockResolvedValue({})

      await retryServiceChain(faker.string.uuid())

      expect(axios.post).toHaveBeenCalledTimes(1)
    })
  })

  describe('validateServiceChain', () => {
    it('should trigger a service chain validate attempt', async () => {
      (axios.post as Mock).mockResolvedValue({})

      await validateServiceChain(faker.string.uuid())

      expect(axios.post).toHaveBeenCalledTimes(1)
    })
  })

  describe('getServiceChainFlows', () => {
    it('should return a service chain flows', async () => {
      (axios.get as Mock).mockResolvedValue({ data: serviceChainFlows })

      await getServiceChainFlows(faker.string.uuid())

      expect(axios.get).toHaveBeenCalledTimes(1)
    })
  })
})
