<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { ClusterPrivacy, type Environment, ProjectAuthorized, projectIsLockedInfo, sortArrByObjKeyAsc } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import { useClusterStore } from '@/stores/cluster.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

interface EnvironmentTile {
  id: string
  title: string
  data: Environment
}

const projectStore = useProjectStore()
const projectEnvironmentStore = useProjectEnvironmentStore()
const clusterStore = useClusterStore()
const snackbarStore = useSnackbarStore()

const environmentsTiles = ref<EnvironmentTile[]>([])

const environmentNames = computed(() => environmentsTiles.value.map(env => env.title))
const allClusters = computed(() => clusterStore.clusters)

const selectedEnvironment = ref<Environment>()
const isNewEnvironmentForm = ref(false)

const projectClustersIds = computed(() => ([
  ...clusterStore.clusters.filter(cluster => cluster.privacy === ClusterPrivacy.PUBLIC).map(({ id }) => id),
  ...projectStore.selectedProject?.clusterIds ?? [],
]))

async function setEnvironmentsTiles() {
  environmentsTiles.value = sortArrByObjKeyAsc(projectEnvironmentStore.environments, 'name')
    .map(environment => ({
      id: environment.id,
      title: environment.name,
      data: environment,
    }) as unknown as EnvironmentTile)
}

function setSelectedEnvironment(environment?: Environment) {
  if (selectedEnvironment.value?.id === environment?.id) {
    selectedEnvironment.value = undefined
    return
  }
  selectedEnvironment.value = environment
  isNewEnvironmentForm.value = false
}

function showNewEnvironmentForm() {
  isNewEnvironmentForm.value = !isNewEnvironmentForm.value
  selectedEnvironment.value = undefined
}

function cancel() {
  isNewEnvironmentForm.value = false
  selectedEnvironment.value = undefined
}

async function addEnvironment(environment: Omit<Environment, 'id' | 'projectId'>) {
  snackbarStore.isWaitingForResponse = true
  if (projectStore.selectedProject && !projectStore.selectedProject.locked) {
    await projectEnvironmentStore.addEnvironmentToProject({ ...environment, projectId: projectStore.selectedProject.id })
  }
  cancel()
  snackbarStore.isWaitingForResponse = false
}

async function putEnvironment(environment: Pick<Environment, 'quotaId' | 'id'>) {
  snackbarStore.isWaitingForResponse = true
  if (projectStore.selectedProject && !projectStore.selectedProject.locked) {
    await projectEnvironmentStore.updateEnvironment(environment.id, environment)
  }
  cancel()
  snackbarStore.isWaitingForResponse = false
}

async function deleteEnvironment(environmentId: Environment['id']) {
  snackbarStore.isWaitingForResponse = true
  await projectEnvironmentStore.deleteEnvironment(environmentId)
  setSelectedEnvironment()
  snackbarStore.isWaitingForResponse = false
}

onMounted(async () => {
  if (!projectStore.selectedProject) return
  await clusterStore.getClusters()
  await projectEnvironmentStore.getProjectEnvironments(projectStore.selectedProject?.id)
  setEnvironmentsTiles()
})

projectEnvironmentStore.$subscribe(() => {
  setEnvironmentsTiles()
})

const canManageEnvs = computed(() => !projectStore.selectedProject?.locked && ProjectAuthorized.ManageEnvironments({ projectPermissions: projectStore.selectedProjectPerms }))
</script>

<template>
  <template
    v-if="projectStore.selectedProject"
  >
    <DsoSelectedProject />
    <div
      class="flex <md:flex-col-reverse items-center justify-between pb-5"
    >
      <DsfrButton
        v-if="!selectedEnvironment && !isNewEnvironmentForm && canManageEnvs"
        label="Ajouter un nouvel environnement"
        data-testid="addEnvironmentLink"
        tertiary
        :disabled="!canManageEnvs"
        :title="projectStore.selectedProject.locked ? projectIsLockedInfo : 'Ajouter un nouvel environnement'"
        class="fr-mt-2v <md:mb-2"
        icon="ri-add-line"
        @click="showNewEnvironmentForm()"
      />
      <div
        v-else
        class="w-full flex justify-end"
      >
        <DsfrButton
          title="Revenir à la liste des environnements"
          data-testid="goBackBtn"
          secondary
          icon-only
          icon="ri-arrow-go-back-line"
          @click="() => cancel()"
        />
      </div>
    </div>
    <div
      v-if="isNewEnvironmentForm"
      class="my-5 pb-10 border-grey-900 border-y-1"
    >
      <EnvironmentForm
        :environment-names="environmentNames"
        :is-project-locked="projectStore.selectedProject.locked"
        :project-clusters-ids="projectClustersIds"
        :all-clusters="clusterStore.clusters"
        :can-manage="canManageEnvs"
        @add-environment="(environment: Omit<Environment, 'id' | 'projectId'>) => addEnvironment(environment)"
        @cancel="cancel()"
      />
    </div>
    <div
      v-else
      :class="{
        'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !selectedEnvironment?.id,
      }"
    >
      <div
        v-for="environment in environmentsTiles"
        :key="environment.id"
        class="fr-mt-2v fr-mb-4w"
      >
        <div
          v-show="!selectedEnvironment"
        >
          <DsfrTile
            :title="environment.title"
            :data-testid="`environmentTile-${environment.title}`"
            :horizontal="!!selectedEnvironment?.id"
            class="fr-mb-2w w-11/12"
            @click="setSelectedEnvironment(environment.data)"
          />
        </div>
        <EnvironmentForm
          v-if="!!selectedEnvironment && selectedEnvironment.id === environment.id"
          :environment="selectedEnvironment"
          :project-clusters-ids="[selectedEnvironment.clusterId]"
          :is-editable="false"
          :is-project-locked="projectStore.selectedProject.locked"
          :can-manage="canManageEnvs"
          :all-clusters="allClusters"
          @put-environment="(environmentUpdate: Pick<Environment, 'quotaId'>) => putEnvironment({ ...environmentUpdate, id: environment.id })"
          @delete-environment="(environmentId: Environment['id']) => deleteEnvironment(environmentId)"
          @cancel="cancel()"
        />
      </div>
      <div
        v-if="!environmentsTiles.length && !isNewEnvironmentForm"
      >
        <p>Aucun environnement déployé</p>
      </div>
    </div>
  </template>
  <!-- N'est jamais sensé s'afficher -->
  <ErrorGoBackToProjects
    v-else
  />
</template>
