<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import type { Environment, Log, PluginsUpdateBody, ProjectService, ProjectV2, Repo } from '@cpn-console/shared'
import fr from 'javascript-time-ago/locale/fr'
import TimeAgo from 'javascript-time-ago'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useUserStore } from '@/stores/user.js'
import { useQuotaStore } from '@/stores/quota.js'
import { useProjectStore } from '@/stores/project.js'
import { useStageStore } from '@/stores/stage.js'
import { bts } from '@/utils/func.js'
import { useLogStore } from '@/stores/log.js'
import router from '@/router/index.js'

const props = defineProps<{ projectId: ProjectV2['id'] }>()

const projectStore = useProjectStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()
const quotaStore = useQuotaStore()
const stageStore = useStageStore()

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

const project = computed(() => projectStore.projectsById[props.projectId])
const environments = ref<Environment[]>()
const repositories = ref<Repo[]>()
// Add locale-specific relative date/time formatting rules.
TimeAgo.addLocale(fr)

// Create relative date/time formatter.
const timeAgo = new TimeAgo('fr-FR')

// const repoRows = computed(() => {
//   if (!project.value.repositories?.length) {
//     return [[{
//       text: 'Aucun dépôt existant',
//       cellAttrs: {
//         colspan: headerRepos.length,
//       },
//     }]]
//   }
//   return sortArrByObjKeyAsc(project.value.repositories, 'internalRepoName')
//     .map(({ internalRepoName, isInfra, externalRepoUrl, isPrivate, createdAt }) => (
//       [
//         internalRepoName,
//         isInfra ? 'Infra' : 'Applicatif',
//         isPrivate ? 'oui' : 'non',
//         externalRepoUrl || '-',
//         {
//           text: timeAgo.format(new Date(createdAt)),
//           title: (new Date(createdAt)).toLocaleString(),
//           component: 'span',
//         },
//       ]
//     ),
//     )
// })

function unSelectProject() {
  router.push({ name: 'ListProjects' })
}

async function updateEnvironmentQuota({ environmentId, quotaId }: { environmentId: string, quotaId: string }) {
  await project.value.Environments.update(environmentId, { quotaId })
}

async function handleProjectLocking() {
  await project.value.update({ locked: !project.value.locked })
}

async function replayHooks() {
  await project.value.replay()
}

async function archiveProject() {
  await project.value.delete()
  unSelectProject()
}

async function addUserToProject(email: string) {
  await project.value.Members.create(email)
  teamCtKey.value = getRandomId('team')
}

async function removeUserFromProject(userId: string) {
  await project.value.Members.delete(userId)
  teamCtKey.value = getRandomId('team')
}

async function transferOwnerShip(nextOwnerId: string) {
  await project.value.update({ ownerId: nextOwnerId })
  teamCtKey.value = getRandomId('team')
}

async function getProjectDetails() {
  try {
    const [projectDetails] = await Promise.all([
      project.value.refresh(),
      reloadProjectServices(),
      showLogs(0),
    ])
    environments.value = projectDetails.environments
    repositories.value = projectDetails.repositories
  } catch (error) {
    console.trace(error)
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
  const resServices = await project.value.Services.list('admin')
  projectServices.value = []
  await nextTick()
  const filteredServices = resServices
  projectServices.value = filteredServices
}

async function saveProjectServices(data: PluginsUpdateBody) {
  try {
    await project.value.Services.update(data)
    snackbarStore.setMessage('Paramètres sauvegardés', 'success')
  } catch (_error) {
    snackbarStore.setMessage('Erreur lors de la sauvegarde', 'error')
  }
  await reloadProjectServices()
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
  <div>
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
        v-if="project"
        title="Revenir à la liste des projets"
        data-testid="goBackBtn"
        secondary
        icon-only
        icon="ri:arrow-go-back-line"
        @click="unSelectProject"
      />
    </div>
    <template v-if="project">
      <div>
        <DsfrCallout
          :title="`${project.name} (${project.organization.name})`"
          :content="project.description"
        />
        <div
          class="w-full flex place-content-evenly fr-mb-2w"
        >
          <DsoBadge
            :resource="{
              ...project,
              locked: bts(project.locked),
              resourceKey: 'locked',
              wording: '',
            }"
          />
          <DsoBadge
            :resource="{
              ...project,
              resourceKey: 'status',
              wording: '',
            }"
          />
        </div>
        <div class="w-full flex gap-4 fr-mb-2w">
          <DsfrButton
            data-testid="replayHooksBtn"
            label="Reprovisionner le projet"
            :icon="{ name: 'ri:refresh-fill', animation: project.operationsInProgress.has('replay') ? 'spin' : '' }"
            :disabled="project.operationsInProgress.has('replay') || project.locked"
            secondary
            @click="replayHooks()"
          />
          <DsfrButton
            data-testid="handleProjectLockingBtn"
            :label="`${project.locked ? 'Déverrouiller' : 'Verrouiller'} le projet`"
            :icon="project.operationsInProgress.has('lockHandling')
              ? { name: 'ri:refresh-fill', animation: 'spin' }
              : project.locked ? 'ri:lock-unlock-fill' : 'ri:lock-fill'"
            :disabled="project.operationsInProgress.has('lockHandling')"
            secondary
            @click="handleProjectLocking"
          />
          <DsfrButton
            v-show="!isArchivingProject"
            data-testid="showArchiveProjectBtn"
            label="Supprimer le projet"
            secondary
            :disabled="project.operationsInProgress.has('delete')"
            :icon="project.operationsInProgress.has('delete')
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
            :label="`Veuillez taper '${project.name}' pour confirmer la suppression du projet`"
            label-visible
            :placeholder="project.name"
            class="fr-mb-2w"
          />
          <div
            class="flex justify-between"
          >
            <DsfrButton
              data-testid="archiveProjectBtn"
              :label="`Supprimer définitivement le projet ${project.name}`"
              secondary
              :disabled="project.operationsInProgress.has('delete') || projectToArchive !== project.name"
              :icon="project.operationsInProgress.has('delete')
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
          >
            <template #header>
              <tr>
                <td
                  v-for="header in headerEnvs"
                  :key="header"
                >
                  {{ header }}
                </td>
              </tr>
            </template>
            <tr
              v-for="env in environments?.sort((e1, e2) => Number(e1.createdAt) - Number(e2.createdAt))"
              :key="env.id"
            >
              <td>{{ env.name }}</td>
              <td>{{ stageStore.stages.find(stage => stage.id === env.stageId)?.name ?? 'Type inconnu...' }}</td>
              <td>
                <DsfrSelect
                  v-model="env.quotaId"
                  label=""
                  :options="quotaStore.quotas.filter(quota => quota.stageIds.includes(env.stageId)).map(quota => ({
                    text: `${quota.name} (${quota.cpu}CPU, ${quota.memory})`,
                    value: quota.id,
                  }))"
                  select-id="quota-select"
                  @update:model-value="(event: string) => updateEnvironmentQuota({ environmentId: env.id, quotaId: event })"
                />
              </td>
              <td
                :title="(new Date(env.createdAt)).toLocaleString()"
              >
                <span>{{ timeAgo.format(new Date(env.createdAt)) }}</span>
              </td>
            </tr>
            <tr
              v-if="!project.environments?.length"
            >
              <td
                :colspan="headerEnvs.length"
              >
                Aucun environnement existant
              </td>
            </tr>
          </DsfrTable>

          <hr>
          <DsfrTable
            :id="repositoriesId"
            :key="repositoriesCtKey"
            title="Dépôts"
          >
            <template #header>
              <tr>
                <td
                  v-for="header in headerRepos"
                  :key="header"
                >
                  {{ header }}
                </td>
              </tr>
            </template>
            <tr
              v-for="repo in repositories"
              :key="repo.id"
            >
              <td>{{ repo.internalRepoName }}</td>
              <td>{{ repo.isInfra ? 'Infra' : 'Applicatif' }}</td>
              <td>{{ repo.isPrivate ? 'oui' : 'non' }}</td>
              <td>{{ repo.externalRepoUrl || '-' }}</td>
              <td
                :title="(new Date(repo.createdAt)).toLocaleString()"
              >
                {{ timeAgo.format(new Date(repo.createdAt)) }}
              </td>
            </tr>
            <tr
              v-if="!repositories?.length"
            >
              <td
                :colspan="headerEnvs.length"
              >
                Aucun dépôt existant
              </td>
            </tr>
          </DsfrTable>
          <hr>
          <TeamCt
            :id="membersId"
            :key="teamCtKey"
            :user-profile="userStore.userProfile"
            :project="project"
            :members="project.members"
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
              :disabled="false"
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
        v-if="project.operationsInProgress.size"
        class="fixed bottom-5 right-5 z-999 shadow-lg background-default-grey"
      >
        <DsfrAlert
          data-testid="operationInProgressAlert"
          title="Opération en cours..."
          :description="project.operationsInProgress.size === 2 ? 'Une ou plusieurs tâches en attente' : ''"
          type="info"
        />
      </div>
    </template>
  </div>
</template>
