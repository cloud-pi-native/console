<script lang="ts" setup>
import { sortArrByObjKeyAsc } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import router from '@/router/index.js'
import { useLogStore } from '@/stores/log.js'
import { useQuotaStore } from '@/stores/quota.js'

const projectStore = useProjectStore()
const quotaStore = useQuotaStore()
const logStore = useLogStore()

const projectList = computed(() => sortArrByObjKeyAsc(projectStore.myProjects, 'name')
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
  router.push('/projects/create-project')
}

onBeforeMount(async () => {
  logStore.displayProjectLogs = false
  await projectStore.getMyProjects()
  await quotaStore.getAllQuotas()
})
</script>

<template>
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
    <ConsumptionPanel
      :ids="projectStore.myProjects.map(({ id }) => id)"
    />
  </div>
  <div
    class="flex flex-row flex-wrap gap-5 items-stretch justify-start gap-8 w-full"
  >
    <div
      v-for="project in projectList"
      :key="project.id"
      class="flex-basis-60 flex-stretch max-w-90"
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
.fr-tile__title [target="_blank"]::after {
  display: none;
}

a.fr-tile__link::after {
  display: none;
}
</style>
