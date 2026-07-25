<script setup lang="ts">
import type { Cluster, Deployment, Environment, Repo, Stage, Zone } from '@cpn-console/shared'
import type { Project } from '@/utils/project-utils.js'
import { ProjectAuthorized } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps<{
  environments: (Environment & { cluster?: Cluster, zone?: Zone, stage?: Stage })[]
  repositories: (Repo & { source: string })[]
  project: Project
  asProfile: 'user' | 'admin'
}>()

const snackbarStore = useSnackbarStore()

const deployments = ref<Deployment[]>([])
const repoOptions = computed(() => props.repositories.map(repo => ({
  text: repo.internalRepoName,
  value: repo.id,
})))

const deploymentsWithStage = computed(() => deployments.value.map((deployment) => {
  const stage = props.environments.find(env => env.id === deployment.environmentId)?.stage
  return {
    ...deployment,
    stage,
  }
}))

const canManageDeploy = computed(() => !props.project.locked && props.asProfile === 'user' && ProjectAuthorized.ManageDeployments({ projectPermissions: props.project.myPerms }))

const isModalOpen = ref(false)
const selectedDeployment = ref<Deployment>()

function openModal(deployment?: Deployment) {
  if (!deployment && (props.environments.length === 0 || props.repositories.length === 0)) {
    snackbarStore.setMessage('Pour créer un déploiement, vous devez d\'abord créer un environnement et un dépôt.', 'error')
    return
  }
  selectedDeployment.value = deployment
  isModalOpen.value = true
}

function closeModal() {
  loadDeployments()
  isModalOpen.value = false
}

async function loadDeployments() {
  deployments.value = await props.project.Deployments.list()
}

onMounted(loadDeployments)

watch([() => props.environments, () => props.repositories], () => {
  loadDeployments()
})
</script>

<template>
  <div class="w-full">
    <div class="w-full flex justify-between items-start">
      <div>
        <h4 class="fr-mb-0">
          Déploiements
        </h4>
        <p>Associez un environnement à un ou plusieurs dépôts pour configurer un déploiment.</p>
      </div>
      <DsfrButton
        v-if="canManageDeploy"
        label="Ajouter un nouveau déploiement"
        tertiary
        title="Ajouter un déploiement"
        icon="ri:add-line"
        @click="() => openModal()"
      />
    </div>
    <div class="w-full flex items-stretch gap-4 flex-wrap">
      <DeploymentCard
        v-for="deployment in deploymentsWithStage"
        :key="deployment.id"
        :deployment="deployment"
        @click="() => openModal(deployment)"
      />
    </div>
  </div>
  <DeploymentModal
    v-model:opened="isModalOpen"
    :environments="props.environments"
    :repo-options="repoOptions"
    :project="props.project"
    :deployment="selectedDeployment"
    :disabled="!canManageDeploy"
    @close="closeModal"
  />
</template>
