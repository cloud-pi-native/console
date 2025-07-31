import type { ServiceChain } from '@cpn-console/shared'
import axios from 'axios'

const openCDSEnvVar = 'OPENCDS_URL'
const opencdsURL = process.env[openCDSEnvVar]
const apiPrefix = 'api/v1'
const openCDSDisabledErrorMessage = `OpenCDS is disabled, please set ${
  openCDSEnvVar
} in your relevant .env file. See .env-example`

function getOpenCDSBaseURL() {
  return `${opencdsURL}/${apiPrefix}`
}

export async function listServiceChains() {
  if (opencdsURL) {
    const response = await axios.get(`${getOpenCDSBaseURL()}/requests`)
    return response.data.map(
      (e: any) =>
        ({
          id: e.id,
          state: e.state,
          success: e.success,
          validation_id: e.validation_id,
          validated_by: e.validated_by,
          version: e.version,
          pai: e.pai,
          ref: e.ref,
          ...e.payload,
          createat: e.createat,
          updateat: e.updateat,
        }) as ServiceChain,
    )
  }
  throw new Error(openCDSDisabledErrorMessage)
}

export async function getServiceChainById(id: ServiceChain['id']) {
  if (opencdsURL) {
    const response = await axios.get(`${getOpenCDSBaseURL()}/requests/${id}`)
    const e = response.data
    return {
      id: e.id,
      state: e.state,
      success: e.success,
      validation_id: e.validation_id,
      validated_by: e.validated_by,
      version: e.version,
      pai: e.pai,
      ref: e.ref,
      ...e.payload,
      createat: e.createat,
      updateat: e.updateat,
    } as ServiceChain
  }
  throw new Error(openCDSDisabledErrorMessage)
}

export async function getServiceChainDetails(id: ServiceChain['id']) {
  if (opencdsURL) {
    const response = await axios.get(`${getOpenCDSBaseURL()}/requests/${id}`)
    const e = response.data
    return {
      id: e.id,
      state: e.state,
      success: e.success,
      validation_id: e.validation_id,
      validated_by: e.validated_by,
      version: e.version,
      pai: e.pai,
      ref: e.ref,
      ...e.payload,
      createat: e.createat,
      updateat: e.updateat,
    } as ServiceChain
  }
  throw new Error(openCDSDisabledErrorMessage)
}
