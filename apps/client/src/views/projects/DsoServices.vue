<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { argocdUrl, gitlabUrl, nexusUrl, quayUrl, sonarqubeUrl, vaultUrl } from '@/utils/env.js'

const projectStore = useProjectStore()

/**
 * @returns {string}
 */
const selectedProject = computed(() => projectStore.selectedProject)
const projectServices = ref([])

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
    if (selectedProject.value.services.includes(service.id)) {
      service.to = service.to.concat(...serviceUrlTail(service.id))
      projectServices.value.push(service)
    }
  })
}

/**
 * @param {string} serviceId
 * @returns {(Array|string)}
 */
const serviceUrlTail = (serviceId) => {
  // ARGOCD_URL/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=<orgName>-<projectName>
  if (serviceId === 'argocd') return ['/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=', selectedProject.value.orgName, '-', selectedProject.value.projectName]
  // GITLAB_URL/forge-mi/projects/<orgName>/<projectName>
  if (serviceId === 'gitlab') return ['/forge-mi/projects/', selectedProject.value.orgName, '/', selectedProject.value.projectName]
  // QUAY_URL/organization/<orgName>-<projectName>
  if (serviceId === 'quay') return ['/organization/', selectedProject.value.orgName, '-', selectedProject.value.projectName]
  // NEXUS_URL/#browse/browse:<orgName>-<projectName>-repository-group
  if (serviceId === 'nexus') return ['/#browse/browse:', selectedProject.value.orgName, '-', selectedProject.value.projectName, '-repository-group']
  // SONARQUBE_URL/dashboard?id=<orgName>-<projectName>
  if (serviceId === 'sonarqube') return ['/dashboard?id=', selectedProject.value.orgName, '-', selectedProject.value.projectName]
  // VAULT_URL/ui/vault/secrets/forge-dso/list/forge-mi/projects/<orgName>/<projectName>
  if (serviceId === 'vault') return ['/ui/vault/secrets/forge-dso/list/forge-mi/projects/', selectedProject.value.orgName, '/', selectedProject.value.projectName]
  return ['']
}

onMounted(() => {
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
