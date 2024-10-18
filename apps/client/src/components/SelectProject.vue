<script setup lang="ts">
import router, { isInProject, selectedProjectId } from '../router/index.js'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'
import { useOrganizationStore } from '@/stores/organization.js'

const organizationStore = useOrganizationStore()
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
  return organizationStore.organizations.map((org) => {
    return {
      org,
      projects: projectStore.myProjects.filter(project => project.organizationId === org.id),
    }
  }).filter(org => org.projects.length)
})

function selectProject(id: string) {
  if (id === myProjects.value) {
    return router.push('/projects')
  }
  if (selectedProjectId.value) {
    return router.push({
      params: { id },
    })
  }
  return router.push({
    name: 'Dashboard',
    params: { id },
  })
}
</script>

<template>
  <div
    v-if="userStore.isLoggedIn"
    class="select-project flex flex-row max-lg:hidden"
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
      <template
        v-for="(group, i) in projectOptions"
        :key="group.org.id"
      >
        <optgroup
          :label="group.org.label"
        >
          <option
            v-for="project in group.projects"
            :key="project.id"
            :class="project.id === selectedProjectId ? 'bg-slate-500' : ''"
            :value="project.id"
            :selected="project.id === selectedProjectId"
          >
            {{ project.name }}
          </option>
        </optgroup>
        <hr v-if="i !== projectOptions.length - 1">
      </template>
    </select>
    <DsfrButton
      :class="`create-project ${projectStore.myProjects.length ? 'w-15' : ''}`"
      type="buttonType"
      secondary
      icon="ri:add-fill"
      :icon-only="!!projectStore.myProjects.length"
      :label="!projectStore.myProjects.length ? 'Créer un nouveau projet' : ''"
      small
      @click="() => router.currentRoute.value.name !== 'CreateProject' && router.push('/projects/create-project')"
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
  background-color: --var(--background-default-grey);
}

.select-project .create-project{
  height: 50px;
}
</style>
