// Utils
export const getSecretObject = ({ DOCKER_CONFIG }: { DOCKER_CONFIG: string }) => {
  const b64dockerConfig = Buffer.from(DOCKER_CONFIG).toString('base64')
  return {
    kind: 'Secret',
    data: {
      '.dockerconfigjson': b64dockerConfig,
    },
    type: 'kubernetes.io/dockerconfigjson',
    metadata: {
      name: 'registry-pull-secret',
    },
  }
}
