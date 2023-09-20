<script lang="ts" setup>
import { onMounted, ref, watch, computed, type ComputedRef, type Ref } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import router from '@/router/index.js'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { sortArrByObjKeyAsc, type ProjectInfos } from '@dso-console/shared'

const projectStore = useProjectStore()
const snackbarStore = useSnackbarStore()

const projects: ComputedRef<Array<ProjectInfos>> = computed(() => projectStore.projects)
const projectList: Ref<Array<Record<any, any>>> = ref([])

const setProjectList = (projects: Array<Record<any, any>>) => {
  projectList.value = sortArrByObjKeyAsc(projects, 'name')
    ?.map(project => ({
      id: project.id,
      title: project.name,
      description: project.organization.label,
      to: `/projects/${project.id}/dashboard`,
    }))
}

const setSelectedProject = async (project: Record<any, any>) => {
  try {
    projectStore.setSelectedProject(project.id)
  } catch (error) {
    if (error instanceof Error) {
      snackbarStore.setMessage(error.message)
      return
    }
    snackbarStore.setMessage('échec de la sélection du projet')
  }
}

const goToCreateProject = () => {
  router.push('projects/create-project')
}

onMounted(async () => {
  try {
    await projectStore.getUserProjects()
  } catch (error) {
    if (error instanceof Error) {
      snackbarStore.setMessage(error.message)
      return
    }
    snackbarStore.setMessage('échec de récupération des projets')
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
    class="md:grid md:grid-cols-3 md:gap-3 items-center justify-between"
  >
    <div
      v-for="project in projectList"
      :key="project.id"
      class="w-11/12 pb-5"
    >
      <DsfrTile
        :title="project.title"
        :data-testid="`projectTile-${project.title}`"
        :to="project.to"
        :description="project.description"
        :horizontal="false"
        @click="setSelectedProject(project)"
      />
    </div>
  </div>
</template>

<style>
/* TODO : wip vue-dsfr fix position flêche */
.fr-tile__title a::after {
  display: none;
}
</style>
