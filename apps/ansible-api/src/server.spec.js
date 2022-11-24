import { vi, describe, it, expect, beforeEach } from 'vitest'
import app from './app.js'
import { startServer } from './server.js'
import { checkPlaybooksAccess } from './ansible.js'

vi.mock('./app.js')
vi.mock('./ansible.js', () => ({ checkPlaybooksAccess: vi.fn() }))
vi.mock('./utils/logger.js')

describe('Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Should start server', async () => {
    await startServer().catch(err => console.warn(err))

    expect(checkPlaybooksAccess.mock.calls).toHaveLength(1)
    expect(app.listen.mock.calls).toHaveLength(1)
  })

  it('Should throw an error if playbook access check failed', async () => {
    const error = new Error('This is OK!')
    checkPlaybooksAccess.mockImplementationOnce(() => { throw error })

    let response
    await startServer().catch(err => { response = err })

    expect(checkPlaybooksAccess.mock.calls).toHaveLength(1)
    expect(app.listen.mock.calls).toHaveLength(0)
    expect(response).toMatchObject(error)
  })
})
