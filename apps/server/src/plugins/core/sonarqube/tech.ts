import axios from 'axios'
import app from '@/app.js'
import { axiosOptions } from './index.js'

const axiosInstance = axios.create(axiosOptions)

export const purgeUsers = async () => {
  const getUsers = await axiosInstance({
    url: 'users/search',
  })
  for (const user of getUsers.data.users) {
    if (user.login !== 'admin') {
      app.log.warn({ message: `${user.login} purged from sonarqube` })
      await axiosInstance({
        url: 'users/deactivate',
        params: {
          login: user.login,
          anonymize: true,
        },
        method: 'post',
      })
    }
  }
}
