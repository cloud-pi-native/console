<script lang="ts" setup>
import type { ProjectV2 } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project'
import router from '@/router/index'
import { useUserStore } from '@/stores/user'

const projectStore = useProjectStore()
const userStore = useUserStore()

const projectList = computed(() => projectStore.myProjects
  .map(project => ({
    ...project,
    description: project.slug !== project.name ? project.slug : '',
    details: userStore.userProfile?.id !== project.owner.id ? `propriétaire: ${project.owner.firstName} ${project.owner.lastName}` : 'propriétaire: Vous',
  }))
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
    class="gap-8 flex flex-wrap"
  >
    <div
      v-for="project in projectList"
      id="project-list"
      :key="project.id"
      class="min-w-75 h-45"
    >
      <DsfrTile
        class="h-full"
        v-bind="project"
        :title="project.name"
        :data-testid="`projectTile-${project.slug}`"
        :to="`/projects/${project.slug}`"
        horizontal
        @click.stop="setSelectedProject(project.slug)"
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

.fr-tile__content {
  padding-bottom: 0 !important;
}

.fr-tile__detail {
  align-items: end;
  height: 100%;
  margin-bottom: 0 !important;
}

#project-list .fr-tile__header {
  display: none;
}
</style>
