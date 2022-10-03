<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project.js'

const projectStore = useProjectStore()

const selectedProject = computed(() => projectStore.selectedProject)

const allTiles = ref([{
  title: 'GitLab',
  imgSrc: '/img/gitlab.png',
  description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
  to: 'https://gitlab.com/',
},
{
  title: 'Vault',
  imgSrc: '/img/vault.png',
  description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes.',
  to: 'https://www.vaultproject.io/',
},
{
  title: 'SonarQube',
  imgSrc: '/img/sonarqube.png',
  description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr.',
  to: 'https://www.sonarqube.org/',
},
{
  title: 'Nexus',
  imgSrc: '/img/nexus.png',
  description: 'Nexus permet de gérer les binaires et artefacts de build à travers la chaîne logistique logicielle.',
  to: 'https://sonatype.com/products/nexus-repository',
},
{
  title: 'Quay',
  imgSrc: '/img/quay.png',
  description: 'Quay construit, analyse et distribue vos images de conteneurs.',
  to: 'https://quay.io/',
},
{
  title: 'ArgoCD',
  imgSrc: '/img/argocd.png',
  description: 'ArgoCD est un outil déclaratif de livraison continue GitOps pour Kubernetes.',
  to: 'https://argo-cd.readthedocs.io/',
}])

const projectTiles = ref([])

// TODO : récupérer dynamiquement services associé au projet pour remplir projectTiles
const setProjectTiles = (project) => {
  if (project.value) {
    allTiles.value.forEach(service => {
      // if (project.value.services.includes(service.title.toLowerCase)) {
      projectTiles.value.push(service)
      // }
    })
  }
}

onMounted(() => {
  setProjectTiles(selectedProject)
})

watch(selectedProject, () => {
  setProjectTiles(selectedProject)
})

</script>

<template>
  <DsfrTiles
    :tiles="projectTiles"
    class="fr-mt-2v"
  />
</template>
