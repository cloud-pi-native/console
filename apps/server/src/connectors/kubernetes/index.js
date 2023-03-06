import k8sApi from './init.js'

export const createKubeNamespace = async ({ organization, project, environment }) => {
  const nsName = `${organization}-${project}-${environment}`
  const nsSearch = (await k8sApi.listNamespace()).body
  const ns = nsSearch.items.find(ns => ns.metadata.name === nsName)
  if (!ns) {
    const nsCreate = await k8sApi.createNamespace({
      metadata: {
        name: nsName,
        labels: {
          'dso-project': project,
          'dso-organization': organization,
          'dso-environment': environment,
        },
      },
    })
    console.log(nsCreate.body)
  }
}

export const deleteKubeNamespace = async (organization, project, environment) => {
  const nsName = `${organization}-${project}-${environment}`
  const nsSearch = (await k8sApi.listNamespace()).body
  const ns = nsSearch.items.find(ns => ns.metadata.name === nsName)
  if (ns) {
    const nsCreate = await k8sApi.deleteNamespace(nsName)
    console.log(nsCreate)
  }
}

export const createArgoResources = async () => {

}
