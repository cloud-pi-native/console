<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { type Repo, projectIsLockedInfo, sortArrByObjKeyAsc } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import { useProjectRepositoryStore } from '@/stores/project-repository.js'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

type RepoTile = {
  id: string,
  title: string,
  data: Repo,
}

const projectStore = useProjectStore()
const projectRepositoryStore = useProjectRepositoryStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()

const isOwner = computed(() => projectStore.selectedProject?.members.some(member => member.userId === userStore.userProfile?.id && member.role === 'owner'))

const repos = ref<RepoTile[]>([])
const selectedRepo = ref<Repo>()
const isNewRepoForm = ref(false)
const branchName = ref<string>('main')

const repoFormId = 'repoFormId'
const syncFormId = 'syncFormId'

const setReposTiles = () => {
  repos.value = sortArrByObjKeyAsc(projectRepositoryStore.repositories, 'internalRepoName')
    ?.map(repo => ({
      id: repo.internalRepoName,
      title: repo.internalRepoName,
      data: repo,
    }) as unknown as RepoTile)
}

const setSelectedRepo = (repo: Repo) => {
  if (selectedRepo.value?.internalRepoName === repo.internalRepoName) {
    selectedRepo.value = undefined
    return
  }
  selectedRepo.value = repo
  isNewRepoForm.value = false
}

const showNewRepoForm = () => {
  isNewRepoForm.value = !isNewRepoForm.value
  selectedRepo.value = undefined
}

const cancel = () => {
  isNewRepoForm.value = false
  selectedRepo.value = undefined
}

const saveRepo = async (repo: Repo) => {
  if (!projectStore.selectedProject) return
  snackbarStore.isWaitingForResponse = true
  if (repo.id) {
    await projectRepositoryStore.updateRepo(repo)
  } else {
    await projectRepositoryStore.addRepoToProject(repo)
  }
  setReposTiles()
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const deleteRepo = async (repoId: Repo['id']) => {
  if (!projectStore.selectedProject) return
  snackbarStore.isWaitingForResponse = true
  await projectRepositoryStore.deleteRepo(repoId)
  setReposTiles()
  selectedRepo.value = undefined
  snackbarStore.isWaitingForResponse = false
}

const syncRepository = async () => {
  if (!selectedRepo.value) return
  if (!branchName.value) branchName.value = 'main'
  snackbarStore.isWaitingForResponse = true
  await projectRepositoryStore.syncRepository(selectedRepo.value.id, branchName.value)
  snackbarStore.isWaitingForResponse = false
  snackbarStore.setMessage(`Job de synchronisation lancé pour le dépôt ${selectedRepo.value.internalRepoName}`)
}

onMounted(() => {
  if (!projectStore.selectedProject) return
  projectRepositoryStore.getProjectRepositories(projectStore.selectedProject.id)
  setReposTiles()
})

projectRepositoryStore.$subscribe(() => {
  setReposTiles()
})

</script>

<template>
  <DsoSelectedProject />
  <template
    v-if="projectStore.selectedProject"
  >
    <div
      class="flex <md:flex-col-reverse items-center justify-between pb-5"
    >
      <DsfrButton
        v-if="!selectedRepo && !isNewRepoForm"
        label="Ajouter un nouveau dépôt"
        data-testid="addRepoLink"
        tertiary
        :disabled="projectStore.selectedProject.locked"
        :title="projectStore.selectedProject.locked ? projectIsLockedInfo : 'Ajouter un dépôt'"
        class="fr-mt-2v <md:mb-2"
        icon="ri-add-line"
        @click="showNewRepoForm()"
      />
      <div
        v-else
        class="w-full flex justify-end"
      >
        <DsfrButton
          title="Revenir à la liste des dépôts"
          data-testid="goBackBtn"
          secondary
          icon-only
          icon="ri-arrow-go-back-line"
          @click="() => cancel()"
        />
      </div>
    </div>
    <div
      v-if="isNewRepoForm"
      class="my-5 pb-10 border-grey-900 border-y-1"
    >
      <RepoForm
        :is-project-locked="projectStore.selectedProject.locked"
        @save="(repo) => saveRepo({...repo, projectId: projectStore.selectedProject.id})"
        @cancel="cancel()"
      />
    </div>
    <div
      v-else
      :class="{
        'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !selectedRepo?.internalRepoName,
      }"
    >
      <div
        v-for="repo in repos"
        :key="repo.id"
        class="fr-mt-2v fr-mb-4w"
      >
        <div
          v-show="!selectedRepo"
        >
          <DsfrTile
            :title="repo.title"
            :data-testid="`repoTile-${repo.id}`"
            :horizontal="!!selectedRepo?.internalRepoName"
            class="fr-mb-2w w-11/12"
            @click="setSelectedRepo(repo.data)"
          />
        </div>
        <div
          v-if="selectedRepo?.internalRepoName === repo.id"
        >
          <DsfrNavigation
            class="fr-mb-4w"
            :nav-items="[
              {
                to: `#${syncFormId}`,
                text: '#Synchroniser le dépôt'
              },
              {
                to: `#${repoFormId}`,
                text: '#Modifier le dépôt'
              },
            ]"
          />
          <div
            :id="syncFormId"
            class="flex flex-col gap-4 fr-mb-4w"
          >
            <h2
              class="fr-h2 fr-mt-2w"
            >
              Synchroniser le dépôt {{ selectedRepo?.internalRepoName }}
            </h2>
            <DsfrInput
              v-model="branchName"
              data-testid="branchNameInput"
              label="Branche cible"
              label-visible
              required
              placeholder="main"
            />
            <DsfrButton
              data-testid="syncRepoBtn"
              label="Lancer la synchronisation"
              secondary
              :disabled="!branchName"
              @click="syncRepository()"
            />
          </div>
          <RepoForm
            :id="repoFormId"
            :is-project-locked="projectStore.selectedProject.locked"
            :is-owner="isOwner"
            :repo="selectedRepo"
            @save="(repo) => saveRepo(repo)"
            @delete="(repoId) => deleteRepo(repoId)"
            @cancel="cancel()"
          />
        </div>
      </div>
      <div
        v-if="!repos.length && !isNewRepoForm"
      >
        <p>Aucun dépôt synchronisé</p>
      </div>
    </div>
  </template>
  <!-- N'est jamais sensé s'afficher -->
  <ErrorGoBackToProjects
    v-else
  />
</template>
