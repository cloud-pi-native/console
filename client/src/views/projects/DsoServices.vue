<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project.js'

const projectStore = useProjectStore()

/**
 * @returns {string}
 */
const selectedProject = computed(() => projectStore.selectedProject)

const allServices = ref([{
  id: 'gitlab',
  title: 'GitLab',
  imgSrc: '/img/gitlab.svg',
  description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
  to: 'https://gitlab.com/',
},
{
  id: 'vault',
  title: 'Vault',
  imgSrc: '/img/vault.svg',
  description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes.',
  to: 'https://www.vaultproject.io/',
},
{
  id: 'sonarqube',
  title: 'SonarQube',
  imgSrc: '/img/sonarqube.svg',
  description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr.',
  to: 'https://www.sonarqube.org/',
},
{
  id: 'nexus',
  title: 'Nexus',
  imgSrc: '/img/nexus.png',
  description: 'Nexus permet de gérer les binaires et artefacts de build à travers la chaîne logistique logicielle.',
  to: 'https://sonatype.com/products/nexus-repository/',
},
{
  id: 'quay',
  title: 'Quay',
  imgSrc: '/img/quay.png',
  description: 'Quay construit, analyse et distribue vos images de conteneurs.',
  to: 'https://quay.io/',
},
{
  id: 'argocd',
  title: 'ArgoCD',
  imgSrc: '/img/argocd.png',
  description: 'ArgoCD est un outil déclaratif de livraison continue GitOps pour Kubernetes.',
  to: 'https://argo-cd.readthedocs.io/',
}])

const projectServices = ref([])

// TODO : à partir de selectedProject, récupérer project.services, project.orgName, project.projectName (et + si nécessaire pour construire url de chaque service)

const setProjectServices = () => {
  if (!selectedProject.value) return
  allServices.value.forEach(service => {
    // TODO : match selectedProject.value.services <=> allServices pour remplir projectServices
    // if (project.services.includes(service.id)) {
    service.to = service.to.concat(...serviceUrlTail(service.id))
    projectServices.value.push(service)
    // }
  })
}

/**
 * @param {string} serviceId
 * @returns {(Array|string)}
 */
// TODO : construction de l'url de chaque service
const serviceUrlTail = (serviceId) => {
  // if (serviceId === 'argocd') return [selectedProject.value.orgName, '/', selectedProject.value.projectName]
  // if (serviceId === 'gitlab') return [selectedProject.value.orgName, '/', selectedProject.value.projectName]
  // if (serviceId === 'quay') return [selectedProject.value.orgName, '/', selectedProject.value.projectName]
  // if (serviceId === 'nexus') return [selectedProject.value.orgName, '/', selectedProject.value.projectName]
  // if (serviceId === 'sonarqube') return [selectedProject.value.orgName, '/', selectedProject.value.projectName]
  // if (serviceId === 'vault') return [selectedProject.value.orgName, '/', selectedProject.value.projectName]
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
  <DsfrTiles
    :tiles="projectServices"
    data-testid="projectTiles"
    class="fr-mt-2v"
  />
</template>
