<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import { ClusterPrivacy, projectIsLockedInfo, sortArrByObjKeyAsc, type Environment, type Project } from '@cpn-console/shared'
import { useUserStore } from '@/stores/user.js'
import { useClusterStore } from '@/stores/cluster.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

type EnvironmentTile = {
  id: string,
  title: string,
  data: Environment,
}

const projectStore = useProjectStore()
const projectEnvironmentStore = useProjectEnvironmentStore()
const userStore = useUserStore()
const clusterStore = useClusterStore()
const snackbarStore = useSnackbarStore()

const project = computed(() => projectStore.selectedProject)
const isOwner = computed(() => project.value?.roles?.some(role => role.userId === userStore.userProfile?.id && role.role === 'owner'))
const environmentNames = computed(() => environments.value.map(env => env.title))
const allClusters = computed(() => clusterStore.clusters)

const environments = ref<EnvironmentTile[]>([])
const selectedEnvironment = ref<Environment>()
const isNewEnvironmentForm = ref(false)

const projectClustersIds = computed(() => ([
  ...clusterStore.clusters.filter(cluster => cluster.privacy === ClusterPrivacy.PUBLIC).map(({ id }) => id),
  ...project.value?.clusterIds ?? [],
]))

const setEnvironmentsTiles = async (projectId: Project['id']) => {
  environments.value = sortArrByObjKeyAsc(await projectEnvironmentStore.getProjectEnvironments(projectId), 'name')
    .map(environment => ({
      id: environment.id,
      title: environment.name,
      data: environment,
    }) as unknown as EnvironmentTile)
}

const setSelectedEnvironment = (environment?: Environment) => {
  if (selectedEnvironment.value?.id === environment?.id) {
    selectedEnvironment.value = undefined
    return
  }
  selectedEnvironment.value = environment
  isNewEnvironmentForm.value = false
}

const showNewEnvironmentForm = () => {
  isNewEnvironmentForm.value = !isNewEnvironmentForm.value
  selectedEnvironment.value = undefined
}

const cancel = () => {
  isNewEnvironmentForm.value = false
  selectedEnvironment.value = undefined
}

const addEnvironment = async (environment: Omit<Environment, 'id' | 'permissions'>) => {
  snackbarStore.isWaitingForResponse = true
  if (project.value && !project.value.locked) {
    await projectEnvironmentStore.addEnvironmentToProject(environment)
  }
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const putEnvironment = async (environment: Pick<Environment, 'quotaId' | 'id'>) => {
  snackbarStore.isWaitingForResponse = true
  if (project.value && !project.value.locked) {
    await projectEnvironmentStore.updateEnvironment(environment.id, environment)
  }
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const deleteEnvironment = async (environmentId: Environment['id']) => {
  snackbarStore.isWaitingForResponse = true
  await projectEnvironmentStore.deleteEnvironment(environmentId)
  setSelectedEnvironment()
  snackbarStore.isWaitingForResponse = false
}

onMounted(async () => {
  if (!project.value) return
  await clusterStore.getClusters()
  await setEnvironmentsTiles(project.value?.id)
})

watch(project, async () => {
  if (!project.value) return
  await setEnvironmentsTiles(project.value?.id)
})
</script>

<template>
  <DsoSelectedProject />
  <template
    v-if="project"
  >
    <div
      class="flex <md:flex-col-reverse items-center justify-between pb-5"
    >
      <DsfrButton
        v-if="!selectedEnvironment && !isNewEnvironmentForm"
        label="Ajouter un nouvel environnement"
        data-testid="addEnvironmentLink"
        tertiary
        :disabled="project?.locked"
        :title="project?.locked ? projectIsLockedInfo : 'Ajouter un nouvel environnement'"
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
        :environment="{projectId: project?.id}"
        :environment-names="environmentNames"
        :is-project-locked="project?.locked"
        :project-clusters-ids="projectClustersIds"
        :all-clusters="clusterStore.clusters"
        @add-environment="(environment: Omit<Environment, 'id' | 'permissions'>) => addEnvironment(environment)"
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
        v-for="environment in environments"
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
          :is-project-locked="project?.locked"
          :is-owner="isOwner"
          :all-clusters="allClusters"
          @put-environment="(environmentUpdate: Pick<Environment, 'quotaId'>) => putEnvironment({...environmentUpdate, id: environment.id })"
          @delete-environment="(environmentId: Environment['id']) => deleteEnvironment(environmentId)"
          @cancel="cancel()"
        />
      </div>
      <div
        v-if="!environments.length && !isNewEnvironmentForm"
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
