<script setup lang="ts">
import router, { isInProject, selectedProjectSlug } from '../router/index.js'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'

const projectStore = useProjectStore()
const userStore = useUserStore()

watch(userStore, async () => {
  if (userStore.isLoggedIn && !projectStore.myProjects?.length) {
    await projectStore.listMyProjects()
  }
})

const myProjects = {
  value: 'myProjects',
  text: 'Mes projets',
}
const projectOptions = computed(() => {
  return projectStore.myProjects
})

function selectProject(slug: string) {
  if (slug === myProjects.value) {
    return router.push({ name: 'Projects' })
  }
  return router.push({
    name: 'Project',
    params: { slug },
    query: { tab: router.currentRoute.value.query?.tab },
  })
}
</script>

<template>
  <div
    v-if="userStore.isLoggedIn"
    class="select-project flex flex-row"
  >
    <select
      v-if="projectStore.myProjects.length"
      id="project-select"
      class="fr-select"
      @change="(e: any) => selectProject(e.target!.value)"
    >
      <option
        :selected="!isInProject"
        :value="myProjects.value"
      >
        {{ myProjects.text }}
      </option>
      <hr>

      <option
        v-for="project in projectOptions"
        :key="project.slug"
        :class="project.slug === selectedProjectSlug ? 'bg-slate-500' : ''"
        :value="project.slug"
        :selected="project.slug === selectedProjectSlug"
      >
        {{ project.name }}<template v-if="project.name !== project.slug">
          &nbsp;({{ project.slug }})
        </template>
      </option>
    </select>
    <DsfrButton
      :class="`create-project ${projectStore.myProjects.length ? 'w-15' : ''}`"
      type="buttonType"
      secondary
      icon="ri:add-line"
      :icon-only="!!projectStore.myProjects.length"
      :label="!projectStore.myProjects.length ? 'Créer un nouveau projet' : ''"
      small
      @click="() => router.currentRoute.value.name !== 'CreateProject' && router.push({ name: 'CreateProject' })"
    />
  </div>
</template>

<style>
.select-project{
  position: absolute;
  padding-top: 1rem;
  top: 0;
  right: 15rem;
  z-index: 1000;
}

.select-project select{
  width: 250px;
  height: 50px;
  background-color: var(--background-default-grey);
}

.select-project .create-project{
  height: 50px;
}
</style>
