
export const getNsObject = (organization, projet, environment, owner) => {
  return {
    metadata: {
      name: `${organization}-${projet}-${environment}`,
      labels: {
        organization,
        projet,
        environment,
        'owner.id': owner.id,
        'owner.firstName': owner.firstName,
        'owner.lastName': owner.lastName,
      },
    },
    kind: 'Namespace',
  }
}

export const getSecretObject = (nsName, { DOCKER_CONFIG }) => {
  const b64dockerConfig = Buffer.from(DOCKER_CONFIG).toString('base64')
  return {

    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'registry-pull-secret',
      namespace: nsName,
    },
    data: { '.dockerconfigjson': b64dockerConfig },
    type: 'kubernetes.io/dockerconfigjson',
  }
}
