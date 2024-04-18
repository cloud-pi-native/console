<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import { projectIsLockedInfo, sortArrByObjKeyAsc, type Environment, type Project } from '@cpn-console/shared'
import { useUserStore } from '@/stores/user.js'
import { useAdminClusterStore } from '@/stores/admin/cluster'
import { useSnackbarStore } from '@/stores/snackbar.js'

type EnvironmentTile = {id: string, title: string, data: Environment}

const projectStore = useProjectStore()
const projectEnvironmentStore = useProjectEnvironmentStore()
const userStore = useUserStore()
const adminClusterStore = useAdminClusterStore()
const snackbarStore = useSnackbarStore()

const project = computed(() => projectStore.selectedProject)
const isOwner = computed(() => project.value?.roles?.some(role => role.userId === userStore.userProfile?.id && role.role === 'owner'))
const environmentNames = computed(() => environments.value.map(env => env.title))
const allClusters = computed(() => adminClusterStore.clusters)

const environments = ref<EnvironmentTile[]>([])
const selectedEnvironment = ref<Environment>()
const isNewEnvironmentForm = ref(false)

const setEnvironmentsTiles = (project: Project) => {
  if (!project.environments) return
  // @ts-ignore
  environments.value = sortArrByObjKeyAsc(project.environments, 'name')
    ?.map(environment => ({
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

const addEnvironment = async (environment: Environment) => {
  snackbarStore.isWaitingForResponse = true
  if (project.value && !project.value.locked) {
    await projectEnvironmentStore.addEnvironmentToProject(environment)
  }
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const putEnvironment = async (environment: Environment) => {
  snackbarStore.isWaitingForResponse = true
  if (project.value && !project.value.locked) {
    await projectEnvironmentStore.updateEnvironment(environment, project.value.id)
  }
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const deleteEnvironment = async (environment: Environment) => {
  snackbarStore.isWaitingForResponse = true
  await projectEnvironmentStore.deleteEnvironment(environment.id)
  setSelectedEnvironment(undefined)
  snackbarStore.isWaitingForResponse = false
}

onMounted(async () => {
  if (!project.value) return
  await adminClusterStore.getClusters()
  setEnvironmentsTiles(project.value)
})

watch(project, () => {
  if (!project.value) return
  setEnvironmentsTiles(project.value)
})
</script>

<template>
  <DsoSelectedProject />
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
      :project-clusters="project?.clusters"
      @add-environment="(environment) => addEnvironment(environment)"
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
        :environment-names="environmentNames"
        :project-clusters="project?.clusters"
        :is-editable="false"
        :is-project-locked="project?.locked"
        :is-owner="isOwner"
        :all-clusters="allClusters"
        @put-environment="(environment) => putEnvironment(environment)"
        @delete-environment="(environment) => deleteEnvironment(environment)"
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
