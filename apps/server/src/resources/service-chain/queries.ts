import {
  ServiceChainDetailsSchema,
  ServiceChainFlowsSchema,
  ServiceChainListSchema,
  type ServiceChain,
} from '@cpn-console/shared'
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
    return ServiceChainListSchema.parse(
      (await axios.get(`${getOpenCDSBaseURL()}/requests`)).data,
    )
  }
  throw new Error(openCDSDisabledErrorMessage)
}

export async function getServiceChainDetails(
  serviceChainId: ServiceChain['id'],
) {
  if (opencdsURL) {
    return ServiceChainDetailsSchema.parse((await axios.get(`${getOpenCDSBaseURL()}/requests/${serviceChainId}`)).data)
  }
  throw new Error(openCDSDisabledErrorMessage)
}

export async function retryServiceChain(serviceChainId: ServiceChain['id']) {
  if (opencdsURL) {
    return await axios.post(
      `${getOpenCDSBaseURL()}/requests/${serviceChainId}/retry`,
    )
  }
  throw new Error(openCDSDisabledErrorMessage)
}

export async function validateServiceChain(validationId: string) {
  if (opencdsURL) {
    return await axios.post(`${getOpenCDSBaseURL()}/validate/${validationId}`)
  }
  throw new Error(openCDSDisabledErrorMessage)
}

export async function getServiceChainFlows(
  serviceChainId: ServiceChain['id'],
) {
  if (opencdsURL) {
    const response = await axios.get(`${getOpenCDSBaseURL()}/requests/${serviceChainId}/flows`)
    return ServiceChainFlowsSchema.parse((response).data)
  }
  throw new Error(openCDSDisabledErrorMessage)
}
