<script lang="ts" setup>
import router from '@/router/index.js'
import { useProjectStore } from '@/stores/project.js'
import { sortArrByObjKeyAsc } from '@cpn-console/shared'

const projectStore = useProjectStore()

const projectList = computed(() => sortArrByObjKeyAsc(projectStore.projects, 'name')
  ?.map(project => ({
    id: project.id,
    title: project.name,
    description: project.organization.label,
    to: `/projects/${project.id}/dashboard`,
  })))

async function setSelectedProject(project: Record<any, any>) {
  projectStore.setSelectedProject(project.id)
}

function goToCreateProject() {
  router.push('projects/create-project')
}
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
      icon="ri:add-line"
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
