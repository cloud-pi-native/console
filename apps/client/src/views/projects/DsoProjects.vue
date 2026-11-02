<script lang="ts" setup>
import { AdminAuthorized } from '@cpn-console/shared'
import { useAsyncAction } from '@/composables/useAsyncAction.js'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'
import { collectionViewState } from '@/utils/list-state.js'

const projectStore = useProjectStore()
const userStore = useUserStore()
const router = useRouter()

const canCreateProject = computed(() => {
  return AdminAuthorized.ManageProjects(userStore.adminPerms)
})

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

const projectCountLabel = computed(() => {
  const count = projectList.value.length
  return `${count} projet${count > 1 ? 's' : ''}`
})

const {
  pending,
  error: loadError,
  run: loadProjects,
} = useAsyncAction(async () => projectStore.listMyProjects())

const viewState = computed(() => collectionViewState({
  loading: pending.value,
  error: loadError.value,
  count: projectList.value.length,
}))

function goToCreateProject() {
  router.push({ name: 'CreateProject' })
}

onMounted(async () => {
  await loadProjects()
})
</script>

<template>
  <h1 class="fr-h3">
    Mes projets
  </h1>

  <div
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      label="Créer un nouveau projet"
      data-testid="createProjectLink"
      tertiary
      class="fr-mt-2v <md:mb-2"
      icon="ri:add-line"
      :disabled="!canCreateProject"
      :title="canCreateProject ? 'Créer un nouveau projet' : 'Vous n\'avez pas les droits pour créer un projet'"
      @click="goToCreateProject()"
    />
  </div>

  <Loader v-if="viewState === 'loading'" />

  <DsfrAlert
    v-else-if="viewState === 'error' && loadError"
    data-testid="projectsLoadError"
    type="error"
    title="Impossible de charger vos projets"
    :description="`${loadError.message} Réessayez dans quelques instants.`"
  />

  <template v-else>
    <p
      v-if="viewState === 'ready'"
      class="fr-text--sm fr-mb-2w"
      data-testid="projectCount"
    >
      {{ projectCountLabel }}
    </p>

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
        />
      </div>
    </div>

    <div
      v-if="viewState === 'empty'"
      data-testid="projectsEmptyState"
      class="fr-py-6w"
    >
      <p class="fr-text--lg fr-mb-1w">
        Vous ne faites pas encore partie d’un projet.
      </p>
      <p class="fr-text--sm fr-mb-3w">
        Un projet regroupe vos environnements, dépôts et déploiements.
        Créez-en un pour démarrer, ou demandez à un propriétaire de projet de vous inviter.
      </p>
      <DsfrButton
        v-if="canCreateProject"
        label="Créer mon premier projet"
        data-testid="createFirstProjectLink"
        primary
        icon="ri:add-line"
        @click="goToCreateProject()"
      />
    </div>
  </template>
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
