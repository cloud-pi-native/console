<script setup lang="ts">
import { useClusterStore } from '@/stores/cluster.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useStageStore } from '@/stores/stage.js'
import { useUserStore } from '@/stores/user.js'
import { useZoneStore } from '@/stores/zone.js'
import { clickInDialog, getRandomId } from '@/utils/func.js'
import type { Project } from '@/utils/project-utils.js'
import type { UpdateEnvironmentBody, Environment, Repo, CreateEnvironmentBody, CleanedCluster, Zone, Cluster } from '@cpn-console/shared'
import { AdminAuthorized, ProjectAuthorized, projectIsLockedInfo } from '@cpn-console/shared'
import TimeAgo from 'javascript-time-ago'
import fr from 'javascript-time-ago/locale/fr'

type Source = 'Privée extérieure' | 'Publique extérieure' | 'Interne'

const props = defineProps<{
  project: Project
  asProfile: 'user' | 'admin'
}>()

const zoneStore = useZoneStore()
const clusterStore = useClusterStore()
const snackbarStore = useSnackbarStore()
const stageStore = useStageStore()
const userStore = useUserStore()

const environments = ref<(Environment & { cluster?: Cluster, zone?: Zone })[]>()
const repositories = ref<(Repo & { source: Source })[]>()
const projectUsage = ref<({
  hprod: { cpu: number, gpu: number, memory: number }
  prod: { cpu: number, gpu: number, memory: number }
})>()

const defaultBranchName = 'main'
const branchName = ref<string>(defaultBranchName)

const environmentsCtKey = ref(getRandomId('environment'))
const repositoriesCtKey = ref(getRandomId('repository'))

const headerEnvs = ['Nom', 'Type', 'Ressources', 'Localisation', 'Date']
const headerRepos = ['Nom', 'Type', 'Source', 'Date']
const repositoriesId = 'repositoriesTable'
const environmentsId = 'environmentsTable'
const syncFormId = 'syncFormId'
const selectedRepo = ref<Repo>()
const selectedEnv = ref<Environment>()
const newResource = ref<'repo' | 'env'>()
const hideEnvs = computed(() => props.asProfile === 'user' && !ProjectAuthorized.ListEnvironments({ projectPermissions: props.project.myPerms }))
const hideRepos = computed(() => props.asProfile === 'user' && !ProjectAuthorized.ListRepositories({ projectPermissions: props.project.myPerms }))

const openedModal = computed(() => !!(selectedRepo.value || selectedEnv.value || newResource.value))

const prodStageId = stageStore.stages.find(stage => stage.name === 'prod')?.id

const publicClusters = computed(() => clusterStore.clusters.filter(({ privacy }) => privacy === 'public'))
const dedicatedProjectClusters = computed(() => clusterStore.clusters.filter(cluster => props.project.clusterIds.includes(cluster.id)))
const projectClusters = computed(() => ([
  ...publicClusters.value,
  ...dedicatedProjectClusters.value,
]))

const canManageEnvs = computed(() => !props.project.locked && props.asProfile === 'user' && ProjectAuthorized.ManageEnvironments({ projectPermissions: props.project.myPerms }))
const canManageRepos = computed(() => !props.project.locked && props.asProfile === 'user' && ProjectAuthorized.ManageRepositories({ projectPermissions: props.project.myPerms }))

watch(selectedRepo, async () => {
  branchName.value = defaultBranchName
})

async function putEnvironment(environment: UpdateEnvironmentBody, envId: Environment['id']) {
  selectedEnv.value = undefined
  if (!props.project.locked) {
    props.project.Environments.update(envId, environment)
      .catch(reason => snackbarStore.setMessage(reason, 'error'))
      .finally(reload)
  }
}

async function deleteEnvironment(environmentId: Environment['id']) {
  selectedEnv.value = undefined
  if (!props.project.locked) {
    props.project.Environments.delete(environmentId)
      .catch(reason => snackbarStore.setMessage(reason, 'error'))
      .finally(reload)
  }
}

async function addEnvironment(environment: Omit<CreateEnvironmentBody, 'id' | 'projectId'>) {
  newResource.value = undefined
  if (!props.project.locked) {
    props.project.Environments.create(environment)
      .catch(reason => snackbarStore.setMessage(reason, 'error'))
      .finally(reload)
  }
}

const isAllSyncing = ref<boolean>(false)

async function saveRepo(repo: Repo) {
  selectedRepo.value = undefined
  newResource.value = undefined
  if (repo.id) {
    props.project.Repositories.update(repo.id, repo)
      .catch(reason => snackbarStore.setMessage(reason, 'error'))
      .finally(reload)
  } else {
    props.project.Repositories.create(repo)
      .catch(reason => snackbarStore.setMessage(reason, 'error'))
      .finally(reload)
  }
}

async function deleteRepo(repoId: Repo['id']) {
  selectedRepo.value = undefined
  props.project.Repositories.delete(repoId)
    .catch(reason => snackbarStore.setMessage(reason, 'error'))
    .finally(reload)
}

async function syncRepository() {
  if (!selectedRepo.value) return
  if (!isAllSyncing.value && !branchName.value) branchName.value = defaultBranchName
  await props.project.Repositories.sync(selectedRepo.value.id, { syncAllBranches: isAllSyncing.value, branchName: branchName.value })
  snackbarStore.setMessage(`Travail de synchronisation lancé pour le dépôt ${selectedRepo.value.internalRepoName}`)
}

// Add locale-specific relative date/time formatting rules.
TimeAgo.addLocale(fr)

// Create relative date/time formatter.
const timeAgo = new TimeAgo('fr-FR')

async function reload() {
  environments.value = await props.project.Environments.list()
    .then(envs => envs.map((environment: Environment) => {
      const cluster = clusterStore.clusters.find(cluster => cluster.id === environment.clusterId)
      const zone = zoneStore.zones.find(zone => zone.id === cluster?.zoneId)
      return {
        ...environment,
        cluster,
        zone,
      }
    }))
  repositories.value = await props.project.Repositories.list()
    .then((repos) => {
      return repos.map((repo: Repo) => {
        let source: Source
        if (repo.externalRepoUrl) {
          source = repo.isPrivate ? 'Privée extérieure' : 'Publique extérieure'
        } else {
          source = 'Interne'
        }
        return {
          ...repo,
          source,
        }
      })
    })
  projectUsage.value = environments.value?.reduce(
    (accumulator, current) => {
      if (current.stageId === prodStageId) {
        accumulator.prod.cpu += current.cpu
        accumulator.prod.gpu += current.gpu
        accumulator.prod.memory += current.memory
      } else {
        accumulator.hprod.cpu += current.cpu
        accumulator.hprod.gpu += current.gpu
        accumulator.hprod.memory += current.memory
      }
      return accumulator
    },
    {
      hprod: { cpu: 0, gpu: 0, memory: 0 },
      prod: { cpu: 0, gpu: 0, memory: 0 },
    },
  )

  console.log(props.project.environments)
}
onMounted(reload)

function closeModal() {
  selectedRepo.value = undefined
  selectedEnv.value = undefined
  newResource.value = undefined
}

// Allow the copy to clipboard on click
const copiedText = ref('')
const MILLISECONDS_UNTIL_CLIPBOARD_CLEAR = 2000

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedText.value = text
    setTimeout(() => (copiedText.value = ''), MILLISECONDS_UNTIL_CLIPBOARD_CLEAR)
  } catch (err) {
    console.error('Erreur de copie :', err)
  }
}
</script>

<template>
  <div
    class="grow"
  >
    <div>
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
          v-for="env in environments?.sort((e1, e2) => Number(e1.name) - Number(e2.name))"
          :key="env.id"
          :data-testid="`environmentTr-${env.name}`"
          @click="selectedEnv = env"
        >
          <td>{{ env.name }}</td>
          <td>{{ stageStore.stages.find(stage => stage.id === env.stageId)?.name ?? 'Type inconnu...' }}</td>
          <td>
            {{ env.memory }}GiB {{ env.cpu }}CPU {{ env.gpu }}GPU
          </td>
          <td>
            <div class="flex flex-row gap-2">
              <Badge
                :name="env.cluster?.label ?? 'Cluster inconnu'"
                type="cluster"
              />
              <Badge
                :name="env.zone?.label ?? 'Zone inconnue'"
                type="zone"
              />
            </div>
          </td>
          <td
            :title="(new Date(env.createdAt)).toLocaleString()"
          >
            <span>{{ timeAgo.format(new Date(env.createdAt)) }}</span>
          </td>
        </tr>
        <tr
          v-if="!environments?.length"
          data-testid="noEnvsTr"
        >
          <td
            :colspan="headerEnvs.length"
          >
            {{ hideEnvs ? 'Vous n\'avez pas les permissions suffisantes' : 'Aucun environnement existant' }}
          </td>
        </tr>
      </DsfrTable>
      <div v-if="!project.limitless">
        Utilisation des ressources projets :
        <ul>
          <li>Hors-Prod: {{ projectUsage?.hprod.memory }}/{{ project.hprodMemory }} GiB {{ projectUsage?.hprod.cpu }}/{{ project.hprodCpu }} CPU {{ projectUsage?.hprod.gpu }}/{{ project.hprodGpu }} GPU</li>
          <li>Prod: {{ projectUsage?.prod.memory }}/{{ project.prodMemory }} GiB {{ projectUsage?.prod.cpu }}/{{ project.prodCpu }} CPU {{ projectUsage?.prod.gpu }}/{{ project.prodGpu }} GPU</li>
        </ul>
      </div>
      <DsfrButton
        v-if="canManageEnvs"
        label="Ajouter un nouvel environnement"
        data-testid="addEnvironmentLink"
        tertiary
        :disabled="project.locked"
        :title="project.locked ? projectIsLockedInfo : 'Ajouter un nouvel environnement'"
        class="fr-mt-2v mb-5"
        icon="ri:add-line"
        @click="newResource = 'env'"
      />
    </div>
  </div>
  <div
    class="grow"
  >
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
        v-for="repo in repositories?.toSorted((a, b) => a.internalRepoName.localeCompare(b.internalRepoName))"
        :key="repo.id"
        :data-testid="`repoTr-${repo.internalRepoName}`"
        @click="selectedRepo = repo"
      >
        <td>{{ repo.internalRepoName }}</td>
        <td
          :title="repo.isInfra ? 'Infrastructure' : 'Application'"
        >
          <v-icon
            v-if="repo.isInfra"
            name="ri:file-info-line"
          />
          <v-icon
            v-else
            name="ri:code-s-slash-line"
          />
        </td>
        <td
          :title="repo.source"
        >
          <div
            class="flex justify-end"
          >
            <template
              v-if="repo.externalRepoUrl"
            >
              <v-icon
                v-if="repo.isPrivate"
                name="ri:git-repository-private-line"
              />
              <v-icon
                v-else
                name="ri:global-line"
              />
              <v-icon
                name="ri:arrow-right-line"
              />
              <v-icon
                name="ri:building-line"
              />
            </template>
            <v-icon
              v-else
              name="ri:building-line"
            />
          </div>
        </td>
        <td
          :title="(new Date(repo.createdAt)).toLocaleString()"
        >
          {{ timeAgo.format(new Date(repo.createdAt)) }}
        </td>
      </tr>
      <tr
        v-if="!repositories?.length"
        data-testid="noReposTr"
      >
        <td
          :colspan="headerRepos.length"
        >
          {{ hideRepos ? 'Vous n\'avez pas les permissions suffisantes' : 'Aucun dépôt existant' }}
        </td>
      </tr>
    </DsfrTable>
    <DsfrButton
      v-if="canManageRepos"
      label="Ajouter un nouveau dépôt"
      data-testid="addRepoLink"
      tertiary
      :disabled="project.locked"
      :title="project.locked ? projectIsLockedInfo : 'Ajouter un dépôt'"
      class="fr-mt-2v <md:mb-2"
      icon="ri:add-line"
      @click="newResource = 'repo'"
    />
  </div>
  <DsfrModal
    v-model:opened="openedModal"
    title=""
    :is-alert="true"
    v-bind="{ clickOutsideDeactivates: true }"
    data-testid="resource-modal"
    @close="closeModal"
    @click="(e: MouseEvent | TouchEvent) => clickInDialog(e, closeModal)"
  >
    <EnvironmentForm
      v-if="selectedEnv"
      :available-clusters="[clusterStore.clusters.find(({ id }) => id === selectedEnv?.clusterId) as CleanedCluster]"
      :environment="selectedEnv"
      :is-editable="false"
      :is-project-locked="project.locked"
      :can-manage="canManageEnvs || (AdminAuthorized.isAdmin(userStore.adminPerms) && asProfile === 'admin')"
      @put-environment="(environmentUpdate: UpdateEnvironmentBody) => putEnvironment(environmentUpdate, selectedEnv!.id)"
      @delete-environment="() => deleteEnvironment(selectedEnv!.id)"
      @cancel="selectedEnv = undefined"
    />
    <EnvironmentForm
      v-else-if="newResource === 'env'"
      :is-project-locked="project.locked"
      :available-clusters="projectClusters"
      :can-manage="canManageEnvs"
      is-editable
      @add-environment="(environment: Omit<CreateEnvironmentBody, 'id' | 'projectId'>) => addEnvironment(environment)"
      @cancel="newResource = undefined"
    />
    <template
      v-else-if="selectedRepo"
    >
      <div
        v-if="ProjectAuthorized.ManageRepositories({ projectPermissions: project.myPerms }) && selectedRepo?.externalRepoUrl && selectedRepo?.id"
        :id="syncFormId"
        class="flex flex-col gap-4 fr-mb-4w"
      >
        <h2
          class="fr-h2 fr-mt-2w"
        >
          Synchroniser le dépôt {{ selectedRepo?.internalRepoName }}
        </h2>
        <div
          class="flex flex-col gap-4 w-2/5"
        >
          <DsfrToggleSwitch
            v-model="isAllSyncing"
            label="Synchroniser toutes les branches"
            name="syncAllBranchesCbx"
            data-testid="toggleSyncAllBranches"
          />
          <DsfrInput
            v-if="!isAllSyncing"
            v-model="branchName"
            data-testid="branchNameInput"
            label="Synchroniser une branche cible"
            label-visible
            :required="!isAllSyncing"
            placeholder="main"
          />
        </div>
        <div
          class="flex space-x-10 mt-5"
        >
          <DsfrButton
            data-testid="syncRepoBtn"
            label="Lancer la synchronisation"
            secondary
            :disabled="!branchName && !isAllSyncing"
            @click="syncRepository()"
          />
          <DsfrButton
            data-testid="getIdRepoBtn"
            label="Récupérer l'ID du dépôt"
            @click="copyToClipboard(selectedRepo.id)"
          />
        </div>
      </div>
      <RepoForm
        :is-project-locked="project.locked"
        :can-manage="canManageRepos"
        :repo="selectedRepo"
        @save="(repo) => saveRepo(repo)"
        @delete="deleteRepo(selectedRepo.id)"
        @cancel="selectedRepo = undefined"
      />
    </template>
    <RepoForm
      v-else-if="newResource === 'repo'"
      :is-project-locked="project.locked"
      :can-manage="canManageRepos"
      @save="(repo) => saveRepo({ projectId: project?.id, ...repo })"
      @cancel="newResource = undefined"
    />
  </DsfrModal>
</template>
