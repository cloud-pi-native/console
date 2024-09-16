import { PatchUtils } from '@kubernetes/client-node'
import { generateApplicationName, generateAppProjectName, getConfig, getCustomK8sApi } from './utils.js'

export async function fixLabels() {
  const customK8sApi = getCustomK8sApi()
  const allApplications = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'applications', undefined, undefined, undefined, undefined, 'app.kubernetes.io/managed-by!=dso-console')
  const allAppProjects = await customK8sApi.listNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, 'appprojects', undefined, undefined, undefined, undefined, 'app.kubernetes.io/managed-by!=dso-console')

  // @ts-ignore
  for (const appProject of allAppProjects.body.items) {
    await fixResource('appprojects', appProject)
  }

  // @ts-ignore
  for (const application of allApplications.body.items) {
    await fixResource('applications', application)
  }
}

interface Resource {
  metadata: {
    [x: string]: any
    labels?: Record<string, string>
    name: string
    namespace: string
  }
}

const patchOptions = { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH } }

async function fixResource(plural: 'applications' | 'appprojects', resource: Resource) {
  const customK8sApi = getCustomK8sApi()
  // ajout de la clé metadata
  if (!resource.metadata.labels)
    resource.metadata.labels = {}

  switch (plural) {
    case 'applications':
      resource.metadata.labels = generateApplicationLabels(resource.metadata.name, resource.metadata.labels)
      break
    case 'appprojects':
      resource.metadata.labels = generateAppProjectLabels(resource.metadata.name, resource.metadata.labels)
      break
  }

  await customK8sApi.patchNamespacedCustomObject('argoproj.io', 'v1alpha1', getConfig().namespace, plural, resource.metadata.name, { metadata: { labels: resource.metadata.labels } }, undefined, undefined, undefined, patchOptions)
}

function generateApplicationLabels(name: string, labels: Record<string, string> = {}): Record<string, string> {
  let isOrphan = true

  const keyElements = name.split('-')
  const organization = keyElements.shift() as string
  keyElements.pop()
  for (let startIndex = 1; startIndex < keyElements.length; startIndex++) {
    for (let endIndex = keyElements.length - 1; endIndex > 1; endIndex--) {
      const projectTest = keyElements.slice(0, startIndex).join('-')
      const environmentTest = keyElements.slice(startIndex, endIndex).join('-')
      const repositoryTest = keyElements.slice(endIndex).join('-')
      const nameComputed = generateApplicationName(organization, projectTest, environmentTest, repositoryTest)
      if (nameComputed === name) {
        labels['dso/organization'] = organization
        labels['dso/project'] = projectTest
        labels['dso/environment'] = environmentTest
        labels['dso/repository'] = repositoryTest
        labels['app.kubernetes.io/managed-by'] = 'dso-console'
        isOrphan = false
      }
    }
  }
  if (isOrphan) {
    console.warn('/!\\ Orphan Application:', name)
  }
  return labels
}

function generateAppProjectLabels(name: string, labels: Record<string, string> = {}): Record<string, string> {
  let isOrphan = true

  const keyElements = name.split('-')
  const organization = keyElements.shift() as string
  keyElements.pop()
  for (let startIndex = 1; startIndex < keyElements.length; startIndex++) {
    const projectTest = keyElements.slice(0, startIndex).join('-')
    const environmentTest = keyElements.slice(startIndex).join('-')
    const nameComputed = generateAppProjectName(organization, projectTest, environmentTest)
    if (nameComputed === name) {
      labels['dso/organization'] = organization
      labels['dso/project'] = projectTest
      labels['dso/environment'] = environmentTest
      labels['app.kubernetes.io/managed-by'] = 'dso-console'
      isOrphan = false
    }
  }
  if (isOrphan) {
    console.warn('/!\\ Orphan Project:', name)
  }
  return labels
}
