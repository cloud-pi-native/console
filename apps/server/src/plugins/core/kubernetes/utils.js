
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

export const getSecretObject = (nsName, { QUAY_ROBOT_USERNAME, QUAY_ROBOT_TOKEN }, registryHost) => {
  const auth = `${QUAY_ROBOT_USERNAME}:${QUAY_ROBOT_TOKEN}` // TODO voir comment récupérer l'ancien et partir sur des noms génériques
  const buff = Buffer.from(auth)
  const b64auth = buff.toString('base64')
  const dockerConfigStr = JSON.stringify({
    auths: {
      [registryHost]: {
        auth: b64auth,
        email: '',
      },
    },
  })
  const b64dockerConfig = Buffer.from(dockerConfigStr).toString('base64')
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
