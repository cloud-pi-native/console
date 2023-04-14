
export const getNsObject = (organization, projet, environment) => {
  return {
    metadata: {
      name: `${organization}-${projet}-${environment}`,
      labels: {
        organization,
        projet,
        environment,
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
      name: 'quay-image-pull-secret',
      namespace: nsName,
    },
    data: { '.dockerconfigjson': b64dockerConfig },
    type: 'kubernetes.io/dockerconfigjson',
  }
}
