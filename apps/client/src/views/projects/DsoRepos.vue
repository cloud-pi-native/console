<script lang="ts" setup>
import { ref } from 'vue'
import type { ProjectV2, Repo } from '@cpn-console/shared'
import { ProjectAuthorized, projectIsLockedInfo } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps<{ projectId: ProjectV2['id'] }>()

const projectStore = useProjectStore()
const snackbarStore = useSnackbarStore()
const project = computed(() => projectStore.projectsById[props.projectId])

const selectedRepo = ref<Repo>()
const isNewRepoForm = ref(false)
const branchName = ref<string>('main')
const isAllSyncing = ref<boolean>(false)

const repoFormId = 'repoFormId'
const syncFormId = 'syncFormId'

const repositories = ref<Repo[]>([])
function setSelectedRepo(repo: Repo) {
  if (selectedRepo.value?.internalRepoName === repo.internalRepoName) {
    selectedRepo.value = undefined
    return
  }
  selectedRepo.value = repo
  isNewRepoForm.value = false
}

function showNewRepoForm() {
  isNewRepoForm.value = !isNewRepoForm.value
  selectedRepo.value = undefined
}

function cancel() {
  isNewRepoForm.value = false
  selectedRepo.value = undefined
}

async function saveRepo(repo: Repo) {
  if (repo.id) {
    await project.value.Repositories.update(repo.id, repo)
  } else {
    await project.value.Repositories.create(repo)
  }
  reload()
}

async function deleteRepo(repoId: Repo['id']) {
  await project.value.Repositories.delete(repoId)
  reload()
}

async function syncRepository() {
  if (!selectedRepo.value) return
  if (!isAllSyncing.value && !branchName.value) branchName.value = 'main'
  snackbarStore.isWaitingForResponse = true
  await project.value.Repositories.sync(selectedRepo.value.id, { syncAllBranches: isAllSyncing.value, branchName: branchName.value })
  snackbarStore.isWaitingForResponse = false
  snackbarStore.setMessage(`Job de synchronisation lancé pour le dépôt ${selectedRepo.value.internalRepoName}`)
}

const canManageRepos = ref<boolean>(false)
async function reload() {
  repositories.value = await project.value.Repositories.list() ?? []
  canManageRepos.value = !project.value.locked && ProjectAuthorized.ManageRepositories({ projectPermissions: project.value.myPerms })
  cancel()
}
watch(project, reload, { immediate: true })
</script>

<template>
  <DsoSelectedProject
    :project-id="projectId"
  >
    <div
      v-if="selectedRepo || isNewRepoForm"
    >
      <DsfrButton
        title="Revenir à la liste des dépôts"
        data-testid="goBackBtn"
        secondary
        icon-only
        icon="ri:arrow-go-back-line"
        @click="() => cancel()"
      />
    </div>
  </DsoSelectedProject>
  <template
    v-if="ProjectAuthorized.ListRepositories({ projectPermissions: project.myPerms })"
  >
    <div
      class="flex <md:flex-col-reverse items-center justify-between pb-5"
    >
      <DsfrButton
        v-if="!selectedRepo && !isNewRepoForm"
        label="Ajouter un nouveau dépôt"
        data-testid="addRepoLink"
        tertiary
        :disabled="project.locked || !canManageRepos"
        :title="project.locked ? projectIsLockedInfo : 'Ajouter un dépôt'"
        class="fr-mt-2v <md:mb-2"
        icon="ri:add-line"
        @click="showNewRepoForm()"
      />
    </div>
    <div
      v-if="isNewRepoForm"
      class="my-5 pb-10 border-grey-900 border-y-1"
    >
      <RepoForm
        :is-project-locked="project.locked"
        :can-manage="canManageRepos"
        @save="(repo) => saveRepo({ projectId: project?.id, ...repo })"
        @cancel="cancel()"
      />
    </div>
    <div
      v-else-if="selectedRepo"
    >
      <DsfrNavigation
        class="fr-mb-4w"
        :nav-items="[
          {
            to: `#${syncFormId}`,
            text: '#Synchroniser le dépôt',
          },
          {
            to: `#${repoFormId}`,
            text: '#Modifier le dépôt',
          },
        ]"
      />
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
        <DsfrButton
          data-testid="syncRepoBtn"
          label="Lancer la synchronisation"
          secondary
          :disabled="!branchName && !isAllSyncing"
          @click="syncRepository()"
        />
      </div>
      <RepoForm
        :id="repoFormId"
        :is-project-locked="project.locked"
        :can-manage="canManageRepos"
        :repo="selectedRepo"
        @save="(repo) => saveRepo(repo)"
        @delete="deleteRepo(selectedRepo.id)"
        @cancel="cancel()"
      />
    </div>
    <div
      v-else-if="repositories?.length"
      class="flex flex-row flex-wrap gap-5 items-stretch justify-start gap-8 w-full"
    >
      <div
        v-for="repo in repositories.sort((r1, r2) => r1.internalRepoName.localeCompare(r2.internalRepoName)) ?? []"
        :key="repo.id"
        class="flex-basis-60 flex-stretch max-w-90"
      >
        <DsfrTile
          :title="repo.internalRepoName"
          :data-testid="`repoTile-${repo.internalRepoName}`"
          @click="setSelectedRepo(repo)"
        />
      </div>
    </div>
    <div v-else>
      <p>Aucun dépôt synchronisé</p>
    </div>
  </template>
  <p
    v-else
  >
    Vous n'avez pas les permissions pour afficher ces ressources
  </p>
</template>
