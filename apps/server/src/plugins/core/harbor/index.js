import axios from 'axios'
import {
  harborUrl,
  harborUser as username,
  harborPassword as password,
} from '../../../utils/env.js'

export const axiosOptions = {
  baseURL: `${harborUrl}api/v2.0/`,
  auth: {
    username,
    password,
  },
}

export const check = async () => {
  let health
  try {
    health = await axios({
      ...axiosOptions,
      url: 'health',
    })
    if (health.data.status !== 'healthy') {
      return {
        status: {
          result: 'KO',
          message: health.data.components,
        },
      }
    }
    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
    }
  }
}
