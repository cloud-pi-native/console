import request from 'supertest'
import app, { apiPrefix } from './app.js'

const version = process.env.npm_package_version

describe('app', () => {
  it('should respond with the version', async () => {
    const response = await request(app)
      .get(`${apiPrefix}/version`)
      .expect(200)
    expect(response.body).toBe(version)
  })
})