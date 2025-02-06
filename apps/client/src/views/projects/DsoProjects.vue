<script lang="ts" setup>
import type { ProjectV2 } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import router from '@/router/index.js'

const projectStore = useProjectStore()

const projectList = computed(() => projectStore.myProjects
  .toSorted((p1, p2) => {
    const nameComp = p1.name.localeCompare(p2.name)
    if (nameComp !== 0) return nameComp
    return p1.slug.localeCompare(p2.slug)
  }))

async function setSelectedProject(slug: ProjectV2['slug']) {
  router.push({
    name: 'Project',
    params: { slug },
  })
}

function goToCreateProject() {
  router.push({ name: 'CreateProject' })
}

onBeforeMount(async () => {
  await projectStore.listMyProjects()
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
        :title="project.name"
        :data-testid="`projectTile-${project.slug}`"
        :to="`/projects/${project.slug}`"
        :description="project.slug !== project.name ? project.slug : undefined"
        :horizontal="false"
        @click="setSelectedProject(project.slug)"
      />
    </div>
    <template
      v-if="!projectList.length"
    >
      <div>
        Vous ne faites parti d'aucun projet pour l'instant
      </div>
    </template>
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
