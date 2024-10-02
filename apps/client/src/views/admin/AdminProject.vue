<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import type { Environment, Log, PluginsUpdateBody, ProjectService, ProjectV2, Repo } from '@cpn-console/shared'
import { sortArrByObjKeyAsc } from '@cpn-console/shared'
import fr from 'javascript-time-ago/locale/fr'
import TimeAgo from 'javascript-time-ago'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import { useUserStore } from '@/stores/user.js'
import { useQuotaStore } from '@/stores/quota.js'
import { useProjectServiceStore } from '@/stores/project-services.js'
import type { ProjectOperations } from '@/stores/project.js'
import { useProjectStore } from '@/stores/project.js'
import { useStageStore } from '@/stores/stage.js'
import { useProjectMemberStore } from '@/stores/project-member.js'
import { bts } from '@/utils/func.js'
import { useLogStore } from '@/stores/log.js'
import router from '@/router/index.js'
import { useProjectRepositoryStore } from '@/stores/project-repository.js'

const props = defineProps<{ projectId: ProjectV2['id'] }>()

const projectStore = useProjectStore()
const projectServiceStore = useProjectServiceStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()
const quotaStore = useQuotaStore()
const stageStore = useStageStore()
const projectMemberStore = useProjectMemberStore()
const projectEnvironmentStore = useProjectEnvironmentStore()
const projectRepositoryStore = useProjectRepositoryStore()

const teamCtKey = ref(getRandomId('team'))
const environmentsCtKey = ref(getRandomId('environment'))
const repositoriesCtKey = ref(getRandomId('repository'))
const isArchivingProject = ref(false)
const projectToArchive = ref('')

const headerEnvs = ['Nom', 'Type d\'environnement', 'Quota', 'Date']
const headerRepos = ['Nom', 'Type', 'Privé ?', 'url', 'Date']
const membersId = 'membersTable'
const repositoriesId = 'repositoriesTable'
const environmentsId = 'environmentsTable'
const servicesId = 'servicesTable'
const logsId = 'logsView'

const selectedProject = computed(() => projectStore.projectsById[props.projectId])

const environments = ref<Environment[]>([])
const repositories = ref<Repo[]>([])
const isLoadingData = ref(true)
// Add locale-specific relative date/time formatting rules.
TimeAgo.addLocale(fr)

// Create relative date/time formatter.
const timeAgo = new TimeAgo('fr-FR')

const envRows = computed(() => {
  if (!environments.value.length) {
    return [[{
      text: 'Aucun environnement existant',
      cellAttrs: {
        colspan: headerEnvs.length,
      },
    }]]
  }
  return sortArrByObjKeyAsc(environments.value, 'createdAt')
    .map(({ id, name, quotaId, stageId, createdAt }) => (
      [
        name,
        stageStore.stages.find(stage => stage.id === stageId)?.name ?? 'Type inconnu..',
        {
          component: 'DsfrSelect',
          modelValue: quotaId,
          selectId: 'quota-select',
          options: quotaStore.quotas.filter(quota => quota.stageIds.includes(stageId)).map(quota => ({
            text: `${quota.name} (${quota.cpu}CPU, ${quota.memory})`,
            value: quota.id,
          })),
          'onUpdate:model-value': (event: string) => updateEnvironmentQuota({ environmentId: id, quotaId: event }),
        },
        {
          text: timeAgo.format(new Date(createdAt)),
          title: (new Date(createdAt)).toLocaleString(),
          component: 'span',
        },
      ]
    ),
    )
})

const repoRows = computed(() => {
  if (!repositories.value.length) {
    return [[{
      text: 'Aucun dépôt existant',
      cellAttrs: {
        colspan: headerRepos.length,
      },
    }]]
  }
  return sortArrByObjKeyAsc(repositories.value, 'internalRepoName')
    .map(({ internalRepoName, isInfra, externalRepoUrl, isPrivate, createdAt }) => (
      [
        internalRepoName,
        isInfra ? 'Infra' : 'Applicatif',
        isPrivate ? 'oui' : 'non',
        externalRepoUrl || '-',
        {
          text: timeAgo.format(new Date(createdAt)),
          title: (new Date(createdAt)).toLocaleString(),
          component: 'span',
        },
      ]
    ),
    )
})

function unSelectProject() {
  router.push({ name: 'ListProjects' })
}

async function doProjectOperation<T>(operation: ProjectOperations, fn: () => Promise<T>) {
  const callback = selectedProject.value.addOperation(operation)
  try {
    const res = await fn()
    await getProjectDetails()
    callback.fn(callback.args)
    return res
  } catch (error) {
    await getProjectDetails()
    callback.fn(callback.args)
    if (error instanceof Error) {
      snackbarStore.setMessage(error.message, 'error')
    } else {
      snackbarStore.setMessage(JSON.stringify(error), 'error')
    }
  }
}
async function updateEnvironmentQuota({ environmentId, quotaId }: { environmentId: string, quotaId: string }) {
  await doProjectOperation(
    'envManagement',
    () => projectEnvironmentStore.updateEnvironment(props.projectId, environmentId, { quotaId }),
  )
}

async function handleProjectLocking() {
  await doProjectOperation(
    'lockHandling',
    () => projectStore.handleProjectLocking(props.projectId, !selectedProject.value.locked, ['all']),
  )
}

async function replayHooks() {
  await doProjectOperation(
    'replay',
    () => projectStore.replayHooksForProject(props.projectId, ['all']),
  )
}

async function archiveProject() {
  await doProjectOperation(
    'delete',
    () => projectStore.archiveProject(props.projectId),
  )
  unSelectProject()
}

async function addUserToProject(email: string) {
  await doProjectOperation(
    'teamManagement',
    () => projectMemberStore.addMember(props.projectId, email),
  )
  teamCtKey.value = getRandomId('team')
}

async function removeUserFromProject(userId: string) {
  await doProjectOperation(
    'teamManagement',
    () => projectMemberStore.removeMember(props.projectId, userId),
  )
  teamCtKey.value = getRandomId('team')
}

async function transferOwnerShip(nextOwnerId: string) {
  await doProjectOperation(
    'teamManagement',
    () => projectStore.updateProject(props.projectId, { ownerId: nextOwnerId }, ['all']),
  )
  teamCtKey.value = getRandomId('team')
}

async function getProjectDetails() {
  try {
    const [envs, repos, ..._] = await Promise.all([
      projectEnvironmentStore.getProjectEnvironments(props.projectId),
      projectRepositoryStore.getProjectRepositories(props.projectId),
      projectStore.getProject(props.projectId, ['all']),
      reloadProjectServices(),
      showLogs(0),
    ])
    environments.value = envs
    repositories.value = repos
    if (selectedProject.value) {
      isLoadingData.value = false
    }
  } catch (error) {
    console.log(error)
  }
}
onBeforeMount(async () => {
  await Promise.all([
    getProjectDetails(),
    stageStore.getAllStages(),
    quotaStore.getAllQuotas(),
  ])
})

const projectServices = ref<ProjectService[]>([])
async function reloadProjectServices() {
  const resServices = await projectServiceStore.getProjectServices(props.projectId, 'admin')
  projectServices.value = []
  await nextTick()
  const filteredServices = resServices
  projectServices.value = filteredServices
}

async function saveProjectServices(data: PluginsUpdateBody) {
  const callback = selectedProject.value.addOperation('saveServices')
  try {
    await projectServiceStore.updateProjectServices(data, selectedProject.value.id)
    snackbarStore.setMessage('Paramètres sauvegardés', 'success')
  } catch (_error) {
    snackbarStore.setMessage('Erreur lors de la sauvegarde', 'error')
  }
  await reloadProjectServices()
  callback.fn(callback.args)
}

// LOGS Rendering functions
const logStore = useLogStore()

const step = 10
const isUpdating = ref(false)
const page = ref(0)

const logs = ref<Log[]>([])
const totalLength = ref(0)

async function showLogs(index?: number) {
  page.value = index ?? page.value
  getProjectLogs({ offset: page.value * step, limit: step })
}

async function getProjectLogs({ offset, limit }: { offset: number, limit: number }) {
  isUpdating.value = true
  const res = await logStore.listLogs({ offset, limit, projectId: props.projectId, clean: false })
  logs.value = res.logs as Log[]
  totalLength.value = res.total
  isUpdating.value = false
}
</script>

<template>
  <div
    class="relative"
  >
    <div
      class="w-full flex gap-4 justify-end fr-mb-1w"
    >
      <DsfrButton
        data-testid="refresh-btn"
        title="Rafraîchir la liste des projets"
        secondary
        icon-only
        icon="ri:refresh-fill"
        :disabled="snackbarStore.isWaitingForResponse"
        @click="async() => {
          await getProjectDetails()
        }"
      />
      <DsfrButton
        v-if="selectedProject"
        title="Revenir à la liste des projets"
        data-testid="goBackBtn"
        secondary
        icon-only
        icon="ri:arrow-go-back-line"
        @click="unSelectProject"
      />
    </div>
    <template v-if="selectedProject">
      <div>
        <DsfrCallout
          :title="`${selectedProject.name} (${selectedProject.organization.name})`"
          :content="selectedProject.description"
        />
        <div
          class="w-full flex place-content-evenly fr-mb-2w"
        >
          <DsoBadge
            :resource="{
              ...selectedProject,
              locked: bts(selectedProject.locked),
              resourceKey: 'locked',
              wording: '',
            }"
          />
          <DsoBadge
            :resource="{
              ...selectedProject,
              resourceKey: 'status',
              wording: '',
            }"
          />
        </div>
        <div class="w-full flex gap-4 fr-mb-2w">
          <DsfrButton
            data-testid="replayHooksBtn"
            label="Reprovisionner le projet"
            :icon="{ name: 'ri:refresh-fill', animation: selectedProject.operationsInProgress.has('replay') ? 'spin' : '' }"
            :disabled="selectedProject.operationsInProgress.has('replay') || selectedProject.locked"
            secondary
            @click="replayHooks()"
          />
          <DsfrButton
            data-testid="handleProjectLockingBtn"
            :label="`${selectedProject.locked ? 'Déverrouiller' : 'Verrouiller'} le projet`"
            :icon="selectedProject.operationsInProgress.has('lockHandling')
              ? { name: 'ri:refresh-fill', animation: 'spin' }
              : selectedProject.locked ? 'ri:lock-unlock-fill' : 'ri:lock-fill'"
            :disabled="selectedProject.operationsInProgress.has('lockHandling')"
            secondary
            @click="handleProjectLocking"
          />
          <DsfrButton
            v-show="!isArchivingProject"
            data-testid="showArchiveProjectBtn"
            label="Supprimer le projet"
            secondary
            :disabled="selectedProject.operationsInProgress.has('delete')"
            :icon="selectedProject.operationsInProgress.has('delete')
              ? { name: 'ri:refresh-fill', animation: 'spin' }
              : 'ri:delete-bin-7-line'"
            @click="isArchivingProject = true"
          />
        </div>
        <div
          v-if="isArchivingProject"
          class="fr-mt-4w"
        >
          <DsfrInput
            v-model="projectToArchive"
            data-testid="archiveProjectInput"
            :label="`Veuillez taper '${selectedProject.name}' pour confirmer la suppression du projet`"
            label-visible
            :placeholder="selectedProject.name"
            class="fr-mb-2w"
          />
          <div
            class="flex justify-between"
          >
            <DsfrButton
              data-testid="archiveProjectBtn"
              :label="`Supprimer définitivement le projet ${selectedProject.name}`"
              secondary
              :disabled="selectedProject.operationsInProgress.has('delete') || projectToArchive !== selectedProject.name"
              :icon="selectedProject.operationsInProgress.has('delete')
                ? { name: 'ri:refresh-fill', animation: 'spin' }
                : 'ri:delete-bin-7-line'"
              @click="archiveProject"
            />
            <DsfrButton
              label="Annuler"
              primary
              @click="isArchivingProject = false"
            />
          </div>
        </div>
        <DsfrNavigation
          class="fr-mb-2w"
          :nav-items="[
            {
              to: `#${environmentsId}`,
              text: '#Environnements',
            },
            {
              to: `#${repositoriesId}`,
              text: '#Dépôts',
            },
            {
              to: `#${membersId}`,
              text: '#Membres',
            },
            {
              to: `#${servicesId}`,
              text: '#Services',
            },
          ]"
        />
        <hr>
        <div
          class="w-full flex flex-col"
        >
          <DsfrTable
            :id="environmentsId"
            :key="environmentsCtKey"
            title="Environnements"
            :headers="headerEnvs"
            :rows="envRows"
          />
          <hr>
          <DsfrTable
            :id="repositoriesId"
            :key="repositoriesCtKey"
            title="Dépôts"
            :headers="headerRepos"
            :rows="repoRows"
          />
          <hr>
          <TeamCt
            :id="membersId"
            :key="teamCtKey"
            :user-profile="userStore.userProfile"
            :project="selectedProject"
            :members="selectedProject.members"
            :can-manage="true"
            :can-transfer="true"
            @add-member="(email: string) => addUserToProject(email)"
            @remove-member="(userId: string) => removeUserFromProject(userId)"
            @transfer-ownership="(nextOwnerId: string) => transferOwnerShip(nextOwnerId)"
          />
          <hr>
          <div
            class="mb-8"
          >
            <ServicesConfig
              :services="projectServices"
              permission-target="admin"
              :display-global="false"
              @update="(data: PluginsUpdateBody) => saveProjectServices(data)"
              @reload="() => reloadProjectServices()"
            />
          </div>
          <hr>
          <div>
            <h4
              :id="logsId"
            >
              Journaux du projet
            </h4>
            <LogsViewer
              :logs="logs"
              :total-length="totalLength"
              :is-updating="isUpdating"
              :page="page"
              :step="step"
              @move-page="showLogs"
            />
          </div>
        </div>
      </div>
      <div
        v-if="selectedProject.operationsInProgress.size"
        class="fixed bottom-5 right-5 z-999 shadow-lg background-default-grey"
      >
        <DsfrAlert
          title="Opération en cours..."
          :description="selectedProject.operationsInProgress.size === 2 ? 'Une ou plusieurs tâches en attente' : ''"
          type="info"
        />
      </div>
    </template>
    <template
      v-else-if="!isLoadingData"
    >
      <p>
        Impossible de trouver le projet
      </p>
      <p>
        <a
          href="/admin/projects"
        >
          Revenir à la liste des projets
        </a>
      </p>
    </template>
  </div>
</template>
