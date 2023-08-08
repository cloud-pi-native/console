import { harborUrl, nexusUrl, vaultUrl, argocdUrl, gitlabUrl, sonarqubeUrl, projectRootDir } from './env.js'
import type { DsoProject } from '@/resources/project/queries.js'

export const allServices = {
  argocd: {
    name: 'argocd',
    url: `${argocdUrl}`,
    title: 'ArgoCD',
    imgSrc: '/img/argocd.png',
    description: 'ArgoCD est un outil déclaratif de livraison continue GitOps pour Kubernetes',
  },
  gitlab: {
    name: 'gitlab',
    url: `${gitlabUrl}`,
    title: 'Gitlab',
    imgSrc: '/img/gitlab.svg',
    description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
  },
  nexus: {
    name: 'nexus',
    url: `${nexusUrl}`,
    title: 'Nexus',
    imgSrc: '/img/nexus.png',
    description: 'Nexus permet de gérer les binaires et artefacts de build à travers la chaîne logistique logicielle',
  },
  registry: {
    name: 'registry',
    url: `${harborUrl}`,
    title: 'Harbor',
    imgSrc: '/img/harbor.png',
    description: 'Harbor stocke, analyse et distribue vos images de conteneurs',
  },
  sonarqube: {
    name: 'sonarqube',
    url: `${sonarqubeUrl}`,
    title: 'Sonarqube',
    imgSrc: '/img/sonarqube.svg',
    description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr',
  },
  vault: {
    name: 'vault',
    url: `${vaultUrl}`,
    title: 'Vault',
    imgSrc: '/img/vault.svg',
    description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
  },
}

export const getServices = (project: DsoProject) => ({
  argocd: {
    ...allServices.argocd,
    to: `${allServices.argocd.url}/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${project.organization?.name}-${project.name}`,
  },

  gitlab: {
    ...allServices.gitlab,
    to: `${allServices.gitlab.url}/${projectRootDir}/${project.organization?.name}/${project.name}`,
  },

  nexus: {
    ...allServices.nexus,
    to: `${allServices.nexus.url}/#browse/browse:${project.organization?.name}-${project.name}-repository-group`,
  },

  registry: {
    ...allServices.registry,
    to: `${allServices.registry.url}/harbor/projects/${project.services?.registry?.id}`,
  },

  sonarqube: {
    ...allServices.sonarqube,
    to: `${allServices.sonarqube.url}/dashboard?id=${project.organization?.name}-${project.name}`,
  },

  vault: {
    ...allServices.vault,
    to: `${allServices.vault.url}/ui/vault/secrets/forge-dso/list/${projectRootDir}/${project.organization?.name}/${project.name}`,
  },
})
