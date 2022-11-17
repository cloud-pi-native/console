<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import RepoForm from '@/components/RepoForm.vue'
import DsoSelectedProject from './DsoSelectedProject.vue'

const projectStore = useProjectStore()

/**
 * @returns {string}
 */
const selectedProject = computed(() => projectStore.selectedProject)
const repos = ref([])
const selectedRepo = ref({})
const isNewRepoForm = ref(false)

const setReposTiles = (selectedProject) => {
  repos.value = selectedProject.repos?.map(repo => ({
    id: repo.internalRepoName,
    title: repo.internalRepoName,
    data: repo,
  }))
}

const setSelectedRepo = (repo) => {
  if (selectedRepo.value.internalRepoName === repo.internalRepoName) {
    selectedRepo.value = {}
    return
  }
  selectedRepo.value = repo
  cancel()
}

const showNewRepoForm = () => {
  isNewRepoForm.value = !isNewRepoForm.value
  selectedRepo.value = {}
}

const cancel = () => {
  isNewRepoForm.value = false
}

const addRepo = async (repo) => {
  cancel()
  await projectStore.addRepoToProject(repo)
}

onMounted(() => {
  setReposTiles(selectedProject.value)
})

watch(selectedProject, () => {
  setReposTiles(selectedProject.value)
})

</script>

<template>
  <DsoSelectedProject />
  <div
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      label="Ajouter un nouveau dépôt"
      data-testid="addRepoLink"
      tertiary
      class="fr-mt-2v <md:mb-2"
      icon="ri-add-line"
      @click="showNewRepoForm()"
    />
  </div>
  <div
    v-if="isNewRepoForm"
    class="my-5 pb-10 border-grey-900 border-y-1"
  >
    <RepoForm
      :repo="{}"
      @add="(repo) => addRepo(repo)"
      @cancel="cancel()"
    />
  </div>
  <div
    v-for="repo in repos"
    :key="repo.id"
    class="fr-mt-2v fr-mb-4w"
  >
    <DsfrTile
      :title="repo.title"
      :data-testid="`repoTile-${repo.id}`"
      :horizontal="true"
      class="fr-mb-2w"
      @click="setSelectedRepo(repo.data)"
    />
    <RepoForm
      v-if="Object.keys(selectedRepo).length !== 0 && selectedRepo.internalRepoName === repo.id"
      :repo="selectedRepo"
      :is-editable="false"
    />
  </div>
</template>
