import app, { apiPrefix } from './app.js'

const version = process.env.npm_package_version

describe('app', () => {
  it('should respond with the version', async () => {
    const response = await app.inject()
      .get(`${apiPrefix}/version`)
      .end()
    expect(response.body).toBe(version)
  })
})