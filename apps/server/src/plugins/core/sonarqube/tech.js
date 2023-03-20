import axios from 'axios'
import app from '../../../app.js'
import { axiosOptions } from './index.js'

export const purgeUsers = async () => {
  const getUsers = await axios({
    ...axiosOptions,
    url: 'users/search',
  })
  for (const user of getUsers.data.users) {
    if (user.login !== 'admin') {
      app.log.warn({ message: `${user.login} purged from sonarqube` })
      await axios({
        ...axiosOptions,
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
