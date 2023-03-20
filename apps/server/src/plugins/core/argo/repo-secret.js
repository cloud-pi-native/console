import { argoNamespace } from '../../../utils/env.js'
import { k8sApi } from './init.js'

export const createRepoSecret = async ({ repo, project, organization }) => {
  const secretName = `${organization}-${project}-${repo.internalRepoName}-repo`
  const secrets = await k8sApi.listNamespacedSecret(argoNamespace, undefined, undefined, undefined, `metadata.name=${secretName}`)
  const secret = secrets.body.items.find(sec => sec.metadata.name === secretName)
  if (!secret) {
    await k8sApi.createNamespacedSecret(argoNamespace, getSecretObject({ repo, project, organization }))
  }
}

export const deleteRepoSecret = async (secretName) => {
  await k8sApi.deleteNamespacedSecret(secretName, argoNamespace)
}

const getSecretObject = ({ repo, project, organization }) => {
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: `${organization}-${project}-${repo.internalRepoName}-repo`,
      namespace: argoNamespace,
      labels: {
        'argocd.argoproj.io/secret-type': 'repository',
      },
    },
    stringData: {
      url: Buffer.from(repo.url).toString('base64'),
    },
  }
}
