<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import router from '@/router/index.js'
import DsoSelectedProject from './DsoSelectedProject.vue'

const projectStore = useProjectStore()

const projects = computed(() => projectStore?.projects)
const projectList = ref([])

const setProjectList = (projects) => {
  projectList.value = projects?.map(project => ({
    id: project.id,
    title: project.name,
    to: `/projects/${project.id}/dashboard`,
    locked: project.locked,
  }))
}

const setSelectedProject = (id) => {
  projectStore.setSelectedProject(id)
}

const goToCreateProject = () => {
  router.push('projects/create-project')
}

onMounted(async () => {
  try {
    await projectStore.getUserProjects()
  } catch (error) {
    console.log(error)
  }
})

watch(projects, (projects) => {
  setProjectList(projects)
})

</script>

<template>
  <DsoSelectedProject />
  <div
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      label="Créer un nouveau projet"
      data-testid="createProjectLink"
      tertiary
      class="fr-mt-2v <md:mb-2"
      icon="ri-add-line"
      @click="goToCreateProject()"
    />
  </div>
  <div
    class="grid grid-cols-3 items-center justify-between"
  >
    <div
      v-for="project in projectList"
      :key="project.id"
      class="w-11/12 pb-5"
    >
      <DsfrTile
        :title="project.title"
        :description="project.locked ? 'opérations en cours' : null"
        :data-testid="`projectTile-${project.title}`"
        :to="project.to"
        :horizontal="false"
        :class="project.locked ? 'disabled-tile' : null"
        @click="setSelectedProject(project.id)"
      />
    </div>
  </div>
</template>
