<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project.js'

const projectStore = useProjectStore()

const selectedProject = computed(() => projectStore.selectedProject)

const allServices = ref([{
  id: 'gitlab',
  title: 'GitLab',
  imgSrc: '/img/gitlab.svg',
  description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
  to: 'https://gitlab.com/',
},
{
  id: 'vaults',
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
  to: 'https://sonatype.com/products/nexus-repository',
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

// TODO : match project.services et allServices pour remplir projectServices
const setProjectServices = (project) => {
  if (!project.value) return
  allServices.value.forEach(service => {
    // if (project.services.includes(service.id)) {
    projectServices.value.push(service)
    // }
  })
}

onMounted(() => {
  setProjectServices(selectedProject)
})

watch(selectedProject, () => {
  setProjectServices(selectedProject)
})

</script>

<template>
  <DsfrTiles
    :tiles="projectServices"
    data-testid="projectTiles"
    class="fr-mt-2v"
  />
</template>
