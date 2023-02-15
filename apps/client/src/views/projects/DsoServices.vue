<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useOrganizationStore } from '@/stores/organization.js'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { argocdUrl, gitlabUrl, nexusUrl, quayUrl, sonarqubeUrl, vaultUrl } from '@/utils/env.js'

const projectStore = useProjectStore()
const organizationStore = useOrganizationStore()

/**
 * @returns {string}
 */
const selectedProject = computed(() => projectStore.selectedProject)
const projectServices = ref([])
const orgName = ref(undefined)

const allServices = ref([{
  id: 'gitlab',
  title: 'GitLab',
  imgSrc: '/img/gitlab.svg',
  description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
  to: gitlabUrl,
},
{
  id: 'vault',
  title: 'Vault',
  imgSrc: '/img/vault.svg',
  description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes.',
  to: vaultUrl,
},
{
  id: 'sonarqube',
  title: 'SonarQube',
  imgSrc: '/img/sonarqube.svg',
  description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr.',
  to: sonarqubeUrl,
},
{
  id: 'nexus',
  title: 'Nexus',
  imgSrc: '/img/nexus.png',
  description: 'Nexus permet de gérer les binaires et artefacts de build à travers la chaîne logistique logicielle.',
  to: nexusUrl,
},
{
  id: 'quay',
  title: 'Quay',
  imgSrc: '/img/quay.png',
  description: 'Quay construit, analyse et distribue vos images de conteneurs.',
  to: quayUrl,
},
{
  id: 'argocd',
  title: 'ArgoCD',
  imgSrc: '/img/argocd.png',
  description: 'ArgoCD est un outil déclaratif de livraison continue GitOps pour Kubernetes.',
  to: argocdUrl,
}])

const setProjectServices = () => {
  projectServices.value = []
  if (!selectedProject.value) return
  allServices.value.forEach(service => {
    service.to = service.to.concat(...serviceUrlTail(service.id))
    projectServices.value.push(service)
  })
}

/**
 * @param {string} serviceId
 * @returns {(Array|string)}
 */
const serviceUrlTail = (serviceId) => {
  // ARGOCD_URL/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=<orgName>-<name>
  if (serviceId === 'argocd') return ['/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=', orgName.value, '-', selectedProject.value.name]
  // GITLAB_URL/forge-mi/projects/<orgName>/<name>
  if (serviceId === 'gitlab') return ['/forge-mi/projects/', orgName.value, '/', selectedProject.value.name]
  // QUAY_URL/organization/<orgName>-<name>
  if (serviceId === 'quay') return ['/organization/', orgName.value, '-', selectedProject.value.name]
  // NEXUS_URL/#browse/browse:<orgName>-<name>-repository-group
  if (serviceId === 'nexus') return ['/#browse/browse:', orgName.value, '-', selectedProject.value.name, '-repository-group']
  // SONARQUBE_URL/dashboard?id=<orgName>-<name>
  if (serviceId === 'sonarqube') return ['/dashboard?id=', orgName.value, '-', selectedProject.value.name]
  // VAULT_URL/ui/vault/secrets/forge-dso/list/forge-mi/projects/<orgName>/<name>
  if (serviceId === 'vault') return ['/ui/vault/secrets/forge-dso/list/forge-mi/projects/', orgName.value, '/', selectedProject.value.name]
  return ['']
}

onMounted(async () => {
  await organizationStore.setOrganizations()
  const org = organizationStore.organizations.find(org => org.id === selectedProject.value.organization)
  orgName.value = org?.name
  setProjectServices()
})

watch(selectedProject, () => {
  setProjectServices()
})

</script>

<template>
  <DsoSelectedProject />
  <DsfrTiles
    :tiles="projectServices"
    data-testid="projectTiles"
    class="fr-mt-2v"
  />
</template>
