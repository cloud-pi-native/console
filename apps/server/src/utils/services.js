import { quayUrl, nexusUrl, vaultUrl, argocdUrl, gitlabUrl, sonarqubeUrl } from './env.js'

export const getServices = (project) => {
  project.services = [{
    id: 'gitlab',
    title: 'GitLab',
    imgSrc: '/img/gitlab.svg',
    description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
    to: `${gitlabUrl}/forge-mi/projects/${project.Organization.dataValues.name}-${project.name}`,
  },
  {
    id: 'vault',
    title: 'Vault',
    imgSrc: '/img/vault.svg',
    description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
    to: `${vaultUrl}/ui/vault/secrets/forge-dso/list/forge-mi/projects/${project.Organization.dataValues.name}-${project.name}`,
  },
  {
    id: 'sonarqube',
    title: 'SonarQube',
    imgSrc: '/img/sonarqube.svg',
    description: 'SonarQube permet à tous les développeurs d\'écrire un code plus propre et plus sûr',
    to: `${sonarqubeUrl}/dashboard?id=${project.Organization.dataValues.name}-${project.name}`,
  },
  {
    id: 'nexus',
    title: 'Nexus',
    imgSrc: '/img/nexus.png',
    description: 'Nexus permet de gérer les binaires et artefacts de build à travers la chaîne logistique logicielle',
    to: `${nexusUrl}/#browse/browse:${project.Organization.dataValues.name}-${project.name}`,
  },
  {
    id: 'quay',
    title: 'Quay',
    imgSrc: '/img/quay.png',
    description: 'Quay construit, analyse et distribue vos images de conteneurs',
    to: `${quayUrl}/organization/${project.Organization.dataValues.name}-${project.name}`,
  },
  {
    id: 'argocd',
    title: 'ArgoCD',
    imgSrc: '/img/argocd.png',
    description: 'ArgoCD est un outil déclaratif de livraison continue GitOps pour Kubernetes',
    to: `${argocdUrl}/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${project.Organization.dataValues.name}-${project.name}`,
  }]

  return project
}
