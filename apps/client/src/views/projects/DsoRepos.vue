<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useProjectRepositoryStore } from '@/stores/project-repository.js'
import { useUserStore } from '@/stores/user.js'
import { projectIsLockedInfo, sortArrByObjKeyAsc } from '@dso-console/shared'
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

const repos = ref([])
const selectedRepo = ref({})
const isNewRepoForm = ref(false)

const setReposTiles = (project) => {
  repos.value = sortArrByObjKeyAsc(project?.repositories, 'internalRepoName')
    ?.map(repo => ({
      id: repo.internalRepoName,
      title: repo.internalRepoName,
      data: repo,
      status: repo.status,
    }))
}

const setSelectedRepo = (repo) => {
  if (selectedRepo.value.internalRepoName === repo.internalRepoName || ['deleting', 'initializing'].includes(repo?.status)) {
    selectedRepo.value = {}
    return
  }
  selectedRepo.value = repo
  isNewRepoForm.value = false
}

const showNewRepoForm = () => {
  isNewRepoForm.value = !isNewRepoForm.value
  selectedRepo.value = {}
}

const cancel = () => {
  isNewRepoForm.value = false
  selectedRepo.value = {}
}

const saveRepo = async (repo) => {
  snackbarStore.isWaitingForResponse = true
  if (repo.id) {
    await projectRepositoryStore.updateRepo(repo)
  } else {
    await projectRepositoryStore.addRepoToProject(repo)
  }
  setReposTiles(project.value)
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const deleteRepo = async (repoId) => {
  snackbarStore.isWaitingForResponse = true
  await projectRepositoryStore.deleteRepo(repoId)
  setReposTiles(project.value)
  selectedRepo.value = {}
  snackbarStore.isWaitingForResponse = false
}

onMounted(() => {
  setReposTiles(project.value)
})

watch(project, () => {
  setReposTiles(project.value)
})

</script>

<template>
  <DsoSelectedProject />
  <div
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      v-if="!Object.keys(selectedRepo).length && !isNewRepoForm"
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
      'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !selectedRepo.internalRepoName,
    }"
  >
    <div
      v-for="repo in repos"
      :key="repo.id"
      class="fr-mt-2v fr-mb-4w"
    >
      <div
        v-show="!Object.keys(selectedRepo).length"
      >
        <DsfrTile
          :title="repo.title"
          :description="['deleting', 'initializing'].includes(repo?.data?.status) ? 'Opérations en cours' : null"
          :data-testid="`repoTile-${repo.id}`"
          :horizontal="!!selectedRepo.internalRepoName"
          :disabled="['deleting', 'initializing'].includes(repo?.data?.status)"
          class="fr-mb-2w w-11/12"
          @click="setSelectedRepo(repo.data)"
        />
        <DsfrBadge
          v-if="repo?.data?.status === 'initializing'"
          :data-testid="`${repo?.data?.internalRepoName}-${repo?.data?.status}-badge`"
          type="info"
          label="Dépôt en cours de création"
        />
        <DsfrBadge
          v-else-if="repo?.data?.status === 'deleting'"
          :data-testid="`${repo?.data?.internalRepoName}-${repo?.data?.status}-badge`"
          type="info"
          label="Dépôt en cours de suppression"
        />
        <DsfrBadge
          v-else-if="repo?.data?.status === 'failed'"
          :data-testid="`${repo?.data?.internalRepoName}-${repo?.data?.status}-badge`"
          type="error"
          label="Echec des opérations"
        />
        <DsfrBadge
          v-else
          :data-testid="`${repo?.data?.internalRepoName}-${repo?.data?.status}-badge`"
          type="success"
          label="Dépôt correctement déployé"
        />
      </div>
      <RepoForm
        v-if="Object.keys(selectedRepo).length && selectedRepo.internalRepoName === repo.id && selectedRepo.status !== 'deleting'"
        :is-project-locked="project?.locked"
        :is-owner="isOwner"
        :repo="selectedRepo"
        @save="(repo) => saveRepo(repo)"
        @delete="(repoId) => deleteRepo(repoId)"
        @cancel="cancel()"
      />
    </div>
    <div
      v-if="!repos.length && !isNewRepoForm"
    >
      <p>Aucun dépôt synchronisé</p>
    </div>
  </div>
</template>
