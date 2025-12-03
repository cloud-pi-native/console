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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getServiceChainDetails,
  getServiceChainFlows,
  listServiceChains,
  retryServiceChain,
  validateServiceChain,
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
      validatedBy: faker.helpers.maybe(() => faker.string.uuid()) || null,
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
      create_cert: faker.helpers.maybe(() => ({
        state: faker.helpers.arrayElement(serviceChainFlowStateEnum),
        input: '{ "foo": 0, "bar": true, "qux": "test" }',
        output: '{ "foo": 0, "bar": true, "qux": "test" }',
        updatedAt: faker.date.recent(),
      })) || null,
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
      const input = [serviceChain];
      (axios.create as Mock).mockReturnValue({
        get: () => ({ data: input }),
      })

      const result = await listServiceChains()

      expect(result).toStrictEqual(input)
    })
  })

  describe('getServiceChainDetails', () => {
    it('should return a service chain details', async () => {
      const input = serviceChainDetails;
      (axios.create as Mock).mockReturnValue({
        get: () => ({ data: input }),
      })

      const result = await getServiceChainDetails(faker.string.uuid())

      expect(result).toStrictEqual(input)
    })
  })

  describe('retryServiceChain', () => {
    it('should trigger a service chain retry attempt', async () => {
      const input = {};
      (axios.create as Mock).mockReturnValue({
        post: () => ({ data: input }),
      })

      const result = await retryServiceChain(faker.string.uuid())

      expect(result.data).toStrictEqual(input)
    })
  })

  describe('validateServiceChain', () => {
    it('should trigger a service chain validate attempt', async () => {
      const input = {};
      (axios.create as Mock).mockReturnValue({
        post: () => ({ data: input }),
      })

      const result = await validateServiceChain(faker.string.uuid())

      expect(result.data).toStrictEqual(input)
    })
  })

  describe('getServiceChainFlows', () => {
    it('should return a service chain flows', async () => {
      const input = serviceChainFlows;
      (axios.create as Mock).mockReturnValue({
        get: () => ({ data: input }),
      })

      const result = await getServiceChainFlows(faker.string.uuid())

      expect(result).toStrictEqual(input)
    })
  })
})
