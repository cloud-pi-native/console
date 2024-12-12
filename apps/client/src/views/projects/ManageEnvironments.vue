<script lang="ts" setup>
import { computed, ref } from 'vue'
import type {
  CreateEnvironmentBody,
  Environment,
  ProjectV2,
  UpdateEnvironmentBody,
} from '@cpn-console/shared'
import {
  ClusterPrivacy,
  ProjectAuthorized,
  projectIsLockedInfo,
} from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import { useClusterStore } from '@/stores/cluster.js'
import { useQuotaStore } from '@/stores/quota.js'
import { useStageStore } from '@/stores/stage.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps<{ projectSlug: ProjectV2['id'] }>()

const snackbarStore = useSnackbarStore()
const projectStore = useProjectStore()
const clusterStore = useClusterStore()
const project = computed(() => projectStore.projectsBySlug[props.projectSlug])

const environments = computed(() =>
// @ts-ignore
  project.value.environments as Environment[],
)

const environmentNames = computed(() => environments.value?.map(env => env.name) ?? [])
const allClusters = computed(() => clusterStore.clusters)

const selectedEnvironment = ref<Environment>()
const isNewEnvironmentForm = ref(false)

const projectClustersIds = computed(() => ([
  ...clusterStore.clusters.filter(cluster => cluster.privacy === ClusterPrivacy.PUBLIC).map(({ id }) => id),
  ...project.value.clusterIds ?? [],
]))

function showNewEnvironmentForm() {
  isNewEnvironmentForm.value = !isNewEnvironmentForm.value
  selectedEnvironment.value = undefined
}

function cancel() {
  isNewEnvironmentForm.value = false
  selectedEnvironment.value = undefined
}

async function addEnvironment(environment: Omit<CreateEnvironmentBody, 'id' | 'projectId'>) {
  if (!project.value.locked) {
    project.value.Environments.create(environment)
      .catch(reason => snackbarStore.setMessage(reason, 'error'))
  }
  reload()
}

async function putEnvironment(environment: UpdateEnvironmentBody) {
  if (!project.value.locked && selectedEnvironment.value?.id) {
    project.value.Environments.update(selectedEnvironment.value.id, environment)
      .catch(reason => snackbarStore.setMessage(reason, 'error'))
  }
  reload()
}

async function deleteEnvironment(environmentId: Environment['id']) {
  if (!project.value.locked) {
    project.value.Environments.delete(environmentId)
      .catch(reason => snackbarStore.setMessage(reason, 'error'))
  }
  reload()
}

const canManageEnvs = ref<boolean>(false)
async function reload() {
  await Promise.all([
    project.value.Environments.list(),
    clusterStore.getClusters(),
    useQuotaStore().getAllQuotas(),
    useStageStore().getAllStages(),
  ])

  canManageEnvs.value = !project.value.locked && ProjectAuthorized.ManageEnvironments({ projectPermissions: project.value.myPerms })
  cancel()
}

watch(project, reload, { immediate: true })
</script>

<template>
  <DsoSelectedProject
    :project-slug="projectSlug"
  >
    <div
      class="flex <md:flex-col-reverse items-center justify-between pb-5"
    >
      <div
        v-if="selectedEnvironment || isNewEnvironmentForm"
        class="w-full flex justify-end"
      >
        <DsfrButton
          title="Revenir à la liste des environnements"
          data-testid="goBackBtn"
          secondary
          icon-only
          icon="ri:arrow-go-back-line"
          @click="cancel"
        />
      </div>
    </div>
  </DsoSelectedProject>
  <template
    v-if="ProjectAuthorized.ListEnvironments({ projectPermissions: project.myPerms })"
  >
    <DsfrButton
      v-if="!selectedEnvironment && !isNewEnvironmentForm && canManageEnvs"
      label="Ajouter un nouvel environnement"
      data-testid="addEnvironmentLink"
      tertiary
      :disabled="!canManageEnvs"
      :title="project.locked ? projectIsLockedInfo : 'Ajouter un nouvel environnement'"
      class="fr-mt-2v mb-5"
      icon="ri:add-line"
      @click="showNewEnvironmentForm"
    />
    <div
      class="w-full"
    >
      <div
        v-if="isNewEnvironmentForm"
        class="my-5 pb-10 border-grey-900 border-y-1"
      >
        <EnvironmentForm
          :environment-names="environmentNames"
          :is-project-locked="project.locked"
          :project-clusters-ids="projectClustersIds"
          :all-clusters="clusterStore.clusters"
          :can-manage="canManageEnvs"
          is-editable
          @add-environment="(environment: Omit<CreateEnvironmentBody, 'id' | 'projectId'>) => addEnvironment(environment)"
          @cancel="cancel()"
        />
      </div>
      <div
        v-else-if="selectedEnvironment"
      >
        <EnvironmentForm
          :environment="selectedEnvironment"
          :project-clusters-ids="[selectedEnvironment.clusterId]"
          :is-editable="false"
          :is-project-locked="project.locked"
          :can-manage="canManageEnvs"
          :all-clusters="allClusters"
          @put-environment="(environmentUpdate: UpdateEnvironmentBody) => putEnvironment({ ...environmentUpdate })"
          @delete-environment="(environmentId: Environment['id']) => deleteEnvironment(environmentId)"
          @cancel="cancel()"
        />
      </div>
      <div
        v-else-if="environments?.length"
        class="flex flex-row flex-wrap gap-5 items-stretch justify-start gap-8 w-full"
      >
        <div
          v-for="environment in environments"
          :key="environment.id"
          class="flex-basis-60 flex-stretch max-w-90"
        >
          <DsfrTile
            :title="environment.name"
            :data-testid="`environmentTile-${environment.name}`"
            @click="selectedEnvironment = environment"
          />
        </div>
      </div>
      <div
        v-else
      >
        <p>Aucun environnement déployé</p>
      </div>
    </div>
  </template>
  <p
    v-else
  >
    Vous n'avez pas les permissions pour afficher ces ressources
  </p>
</template>
