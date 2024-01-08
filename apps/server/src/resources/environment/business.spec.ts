import { describe, expect, it, vi } from 'vitest'
import { deleteEnvironments } from './business.ts'
import { deleteEnvironment as deleteEnvironmentQuery, addLogs, getClusterById } from '@/resources/queries-index.js'
import { hooks } from '@/plugins/index.js'

vi.mock('@/plugins/index.js', () => ({
  hooks: {
    deleteEnvironment: {
      execute: vi.fn(() => ({ failed: false })),
    },
  },
}))

vi.mock('@/resources/queries-index.js', async () => {
  const actual = await vi.importActual('@/resources/queries-index.js')
  return {
    ...actual,
    getClusterById: vi.fn(() => ({ id: 'clusterId', kubeconfig: {} })),
    addLogs: vi.fn(),
    deleteEnvironment: vi.fn(),
  }
})

// Décrivez votre suite de tests
describe('deleteEnvironments', () => {
  const createdAt = new Date()
  const updatedAt = new Date()
  const envs: Parameters<typeof deleteEnvironments>[1] = [
    { id: 'envId1', clusterId: 'clusterId1', createdAt, updatedAt, name: 'env1', projectId: 'project1', quotaStageId: 'quotaStage1', status: 'active', stage: 'dev' },
    { id: 'envId2', clusterId: 'clusterId2', createdAt, updatedAt, name: 'env1', projectId: 'project1', quotaStageId: 'quotaStage1', status: 'active', stage: 'prod' },
  ]

  // Testez le cas où tout se passe bien
  it('should delete environments successfully', async () => {
    // Mockez les données d'entrée
    const envIdsToDelete = ['envId1', 'envId2']
    const allEnvironments = structuredClone(envs)
    const project = { name: 'projectName', organization: { name: 'orgName' }, roles: [] }
    const repositories = []
    const requestorId = 'userId'

    // Appelez la fonction et attendez-vous à ce qu'elle ne lève pas d'erreur
    await expect(
      deleteEnvironments(envIdsToDelete, allEnvironments, project, repositories, [], requestorId),
    ).resolves.not.toThrow()

    // Vérifiez si les fonctions/mock ont été appelées comme prévu
    expect(hooks.deleteEnvironment.execute).toHaveBeenCalledTimes(2) // Une fois pour chaque environnement
    expect(addLogs).toHaveBeenCalledWith('Delete Environments', expect.anything(), 'userId')
    expect(getClusterById).toHaveBeenNthCalledWith(1, 'clusterId1')
    expect(getClusterById).toHaveBeenNthCalledWith(2, 'clusterId2')
    expect(deleteEnvironmentQuery).toHaveBeenCalledTimes(2)
  })

  // Testez le cas où la suppression de l'environnement échoue
  it('should throw an UnprocessableContentError when deleting environment fails', async () => {
    // Mockez les données d'entrée
    const envIdsToDelete = ['envId1']
    const allEnvironments = [envs[0]]
    const project = { name: 'projectName', organization: { name: 'orgName' }, roles: [] }
    const repositories = []
    const clusters = []
    const requestorId = 'userId'

    // Modifiez le mock pour simuler une suppression d'environnement échouée
    hooks.deleteEnvironment.execute.mockImplementation(() => ({ failed: true }))

    // Appelez la fonction et attendez-vous à ce qu'elle lève une erreur UnprocessableContentError
    await expect(
      deleteEnvironments(envIdsToDelete, allEnvironments, project, repositories, clusters, requestorId),
    ).rejects.toThrowError('Echec des services à la suppression de l\'environnement')

    expect(getClusterById).toHaveBeenCalledWith('clusterId1')
  })
})
