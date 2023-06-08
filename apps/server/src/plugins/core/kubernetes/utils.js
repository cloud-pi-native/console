
export const getNsObject = (organization, projet, environment, owner) => {
  return {
    metadata: {
      name: `${organization}-${projet}-${environment}`,
      labels: {
        'dso/organization': organization,
        'dso/projet': projet,
        'dso/environment': environment,
        'dso/owner.id': owner.id,
        // 'dso/owner.firstName': owner.firstName, // deactivate, need time to find a way to validate/transform specials chars
        // 'dso/owner.lastName': owner.lastName,
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
