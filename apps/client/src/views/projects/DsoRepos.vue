<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useProjectRepositoryStore } from '@/stores/project-repository.js'
import { useUserStore } from '@/stores/user.js'
import { CreateRepoBusinessSchema, Repo, UpdateRepoBusinessSchema, projectIsLockedInfo, sortArrByObjKeyAsc, type XOR } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'

const projectStore = useProjectStore()
const projectRepositoryStore = useProjectRepositoryStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()

/**
 * @returns {string}
 */
const project = computed(() => projectStore.selectedProject)
const isOwner = computed(() => project.value?.roles.some(role => role.userId === userStore.userProfile.id && role.role === 'owner'))

const repos: Ref<{
  id: string,
  title: string,
  data: Repo,
}[]> = ref([])
const selectedRepo: Ref<Repo | undefined> = ref()
const isNewRepoForm = ref(false)

const setReposTiles = () => {
  if (project.value?.repositories) {
    repos.value = project.value.repositories
      ? sortArrByObjKeyAsc(project.value.repositories, 'internalRepoName')
        ?.map(repo => ({
          id: repo.internalRepoName,
          title: repo.internalRepoName,
          data: repo,
        }))
      : []
  }
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

const saveRepo = async (repo: XOR<typeof UpdateRepoBusinessSchema._input, typeof CreateRepoBusinessSchema._input>) => {
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

const deleteRepo = async (repoId: string) => {
  snackbarStore.isWaitingForResponse = true
  await projectRepositoryStore.deleteRepo(repoId)
  setReposTiles()
  selectedRepo.value = undefined
  snackbarStore.isWaitingForResponse = false
}

onMounted(() => {
  setReposTiles()
})

watch(project, () => {
  setReposTiles()
})

</script>

<template>
  <DsoSelectedProject />
  <div
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      v-if="!selectedRepo && !isNewRepoForm"
      label="Ajouter un nouveau dépôt"
      data-testid="addRepoLink"
      tertiary
      :disabled="project?.locked"
      :title="project?.locked ? projectIsLockedInfo : 'Ajouter un dépôt'"
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
      :is-project-locked="project?.locked"
      @save="(repo) => saveRepo(repo)"
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
          :horizontal="!!selectedRepo"
          class="fr-mb-2w w-11/12"
          @click="setSelectedRepo(repo.data)"
        />
      </div>
    </div>
    <RepoForm
      v-if="selectedRepo"
      :is-project-locked="project?.locked"
      :is-owner="isOwner"
      :repo="selectedRepo"
      @save="(repo) => saveRepo(repo)"
      @delete="(repoId) => deleteRepo(repoId)"
      @cancel="cancel()"
    />
    <div
      v-if="!repos.length && !isNewRepoForm"
    >
      <p>Aucun dépôt synchronisé</p>
    </div>
  </div>
</template>
