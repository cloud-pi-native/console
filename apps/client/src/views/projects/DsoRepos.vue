<script setup>
import { ref, computed, onMounted } from 'vue'
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
  repos.value = selectedProject.repo?.map(repo => ({
    id: repo.gitName,
    title: repo.gitName,
    data: repo,
  }))
}

const setSelectedRepo = (repo) => {
  if (selectedRepo.value.gitName === repo.gitName) {
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
  const project = selectedProject.value
  project.repo ||= []
  project.repo = [...project.repo, repo]
  cancel()
  await projectStore.updateProject(project)
}

onMounted(() => {
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
      v-if="Object.keys(selectedRepo).length !== 0 && selectedRepo.gitName === repo.id"
      :repo="selectedRepo"
      :is-editable="false"
    />
  </div>
  <div
    v-if="isNewRepoForm"
    class="mt-10 border-grey-900 border-t-1"
  >
    <RepoForm
      :repo="{}"
      @add="(repo) => addRepo(repo)"
      @cancel="cancel()"
    />
  </div>
</template>
