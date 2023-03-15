import { quayUrl, nexusUrl, vaultUrl, argocdUrl, gitlabUrl, sonarqubeUrl } from './env.js'

export const allServices = {
  argocd: {
    id: 'argocd',
    url: `${argocdUrl}`,
    title: 'ArgoCD',
    imgSrc: '/img/argocd.png',
    description: 'ArgoCD est un outil déclaratif de livraison continue GitOps pour Kubernetes',
  },
  gitlab: {
    id: 'gitlab',
    url: `${gitlabUrl}`,
    title: 'Gitlab',
    imgSrc: '/img/gitlab.svg',
    description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
  },
  nexus: {
    id: 'nexus',
    url: `${nexusUrl}`,
    title: 'Nexus',
    imgSrc: '/img/nexus.png',
    description: 'Nexus permet de gérer les binaires et artefacts de build à travers la chaîne logistique logicielle',
  },
  quay: {
    id: 'quay',
    url: `${quayUrl}`,
    title: 'Quay',
    imgSrc: '/img/quay.png',
    description: 'Quay construit, analyse et distribue vos images de conteneurs',
  },
  sonarqube: {
    id: 'sonarqube',
    url: `${sonarqubeUrl}`,
    title: 'sonarqube',
    imgSrc: '/img/sonarqube.svg',
    description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr',
  },
  vault: {
    id: 'vault',
    url: `${vaultUrl}`,
    title: 'Vault',
    imgSrc: '/img/vault.svg',
    description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
  },
}

export const getServices = (project) => ({
  argocd: {
    ...allServices.argocd,
    to: `${allServices.argocd.url}/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${project.organization.name}-${project.name}`,
  },

  gitlab: {
    ...allServices.gitlab,
    to: `${allServices.gitlab.url}/forge-mi/projects/${project.organization.name}/${project.name}`,
  },

  nexus: {
    ...allServices.nexus,
    to: `${allServices.nexus.url}/#browse/browse:${project.organization.name}-${project.name}-repository-group`,
  },

  quay: {
    ...allServices.quay,
    to: `${allServices.quay.url}/organization/${project.organization.name}-${project.name}`,
  },

  sonarqube: {
    ...allServices.sonarqube,
    to: `${allServices.sonarqube.url}/dashboard?id=${project.organization.name}-${project.name}`,
  },

  vault: {
    ...allServices.vault,
    to: `${allServices.vault.url}/ui/vault/secrets/forge-dso/list/forge-mi/projects/${project.organization.name}/${project.name}`,
  },
})
