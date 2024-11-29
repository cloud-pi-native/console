<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import type { ArrayElement, Organization, ProjectV2, projectContract } from '@cpn-console/shared'
import { bts, statusDict } from '@cpn-console/shared'
import TimeAgo from 'javascript-time-ago'
import fr from 'javascript-time-ago/locale/fr'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useProjectStore } from '@/stores/project.js'
import router from '@/router/index.js'
import { apiClient, extractData } from '@/api/xhr-client.js'

const projectStore = useProjectStore()
const snackbarStore = useSnackbarStore()

type FileForDownload = File & {
  href?: string
  format?: string
  title?: string
}

const tableKey = ref(getRandomId('table'))
const inputSearchText = ref('')
const isLoading = ref(true)
const activeFilter = ref<keyof FilterMethods>('Non archivés')
const file = ref<FileForDownload | undefined>(undefined)
const queryChanged = ref(false)
// Add locale-specific relative date/time formatting rules.
TimeAgo.addLocale(fr)

// Create relative date/time formatter.
const timeAgo = new TimeAgo('fr-FR')

const title = 'Liste des projets'

const bulkActions: Array<{
  text: string
  value: typeof projectContract.bulkActionProject.body._type.action
}> = [
  { text: 'Reprovisionner', value: 'replay' },
  { text: 'Vérrouiller', value: 'lock' },
  { text: 'Dévérouiller', value: 'unlock' },
  { text: 'Archiver', value: 'archive' },
] as const
type BulkActions = (typeof bulkActions)[number]['value']
const selectedAction = ref<BulkActions>('replay')

type FilterMethods = Record<string, typeof projectContract.listProjects.query._type>
const filterMethods: FilterMethods = {
  Tous: { filter: 'all' },
  'Non archivés': { filter: 'all', statusNotIn: 'archived' },
  Archivés: { filter: 'all', statusIn: 'archived' },
  Échoués: { filter: 'all', statusIn: 'failed' },
  Verrouillés: { filter: 'all', locked: true, statusNotIn: 'archived' },
}

const selectedProjectIds = ref<ProjectV2['id'][]>([])
const projects = ref<(ProjectV2 & { organization: Organization })[]>([])
const projectWithSelection = computed(() => projects.value.map(project => ({ ...project, selected: selectedProjectIds.value.includes(project.id) })))
const selectedProjects = computed(() => projectWithSelection.value.filter(project => project.selected))

const isAllSelected = computed<boolean>(() => {
  return selectedProjects.value.length === projects.value.length
})

function selectAll() {
  if (isAllSelected.value) {
    selectedProjectIds.value = []
  } else {
    selectedProjectIds.value = projects.value.map(({ id }) => id)
  }
}

function switchSelection(checked: boolean, id: ProjectV2['id']) {
  selectedProjectIds.value = selectedProjectIds.value.filter(projectId => projectId !== id)
  if (checked) {
    selectedProjectIds.value.push(id)
  }
}

async function getProjects() {
  queryChanged.value = false
  isLoading.value = true
  try {
    projects.value = await projectStore.listProjects({
      ...filterMethods[activeFilter.value],
      ...inputSearchText.value && { search: inputSearchText.value.toLowerCase() },
    })
  } finally {
    isLoading.value = false
    tableKey.value = getRandomId('table')
  }
}

async function goToProject(projectId: string) {
  router.push({
    name: 'AdminProject',
    params: { id: projectId },
  })
}

async function generateProjectsDataFile() {
  file.value = new File([await projectStore.generateProjectsData()], 'dso-projects.csv', {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(file.value)

  file.value = {
    ...file.value,
    href: url,
    size: file.value.size,
    format: 'CSV',
    title: 'dso-projects.csv',
  }
}

onBeforeMount(async () => {
  await getProjects()
})

async function validateBulkAction() {
  await apiClient.Projects.bulkActionProject({
    body: {
      action: selectedAction.value,
      projectIds: selectedProjects.value.map(({ id }) => id),
    },
  }).then(res => extractData(res, 202))
  selectedProjectIds.value = []
  snackbarStore.setMessage('Traitement en cours, en fonction du nombre de projets cela peut prendre plusieurs minutes, veuillez rafraichir dans quelques instants')
}

function clickProject(project: ArrayElement<typeof projectWithSelection.value>) {
  if (project.selected)
    return switchSelection(false, project.id)
  if (selectedProjects.value.length)
    return switchSelection(true, project.id)
  if (project.status === 'archived')
    return snackbarStore.setMessage('Le projet est archivé, pas d\'action possible', 'info')
  return goToProject(project.id)
}
</script>

<template>
  <div
    class="relative"
  >
    <div
      class="flex justify-between gap-5 w-full items-end mb-5"
    >
      <div
        class="flex gap-5 w-max items-end"
      >
        <DsfrSelect
          v-model="activeFilter"
          select-id="projectSearchFilter"
          label="Filtre rapide"
          class="mb-0"
          :options="Object.keys(filterMethods)"
          @update:model-value="queryChanged = true"
        />
        <DsfrInputGroup
          v-model="inputSearchText"
          data-testid="projectsSearchInput"
          label-visible
          placeholder="Recherche textuelle"
          label="Recherche"
          class="mb-0"
          @update:model-value="queryChanged = true"
          @keyup.enter="getProjects"
        />
        <DsfrButton
          label="Rechercher"
          data-testid="projectsSearchBtn"
          v-bind="{ tertiary: !queryChanged, secondary: queryChanged }"
          @click="getProjects"
        />
      </div>
      <div
        class="w-auto flex gap-4 justify-end"
      >
        <DsfrButton
          data-testid="download-btn"
          title="Exporter les données de tous les projets"
          secondary
          icon-only
          icon="ri:file-download-line"
          :disabled="snackbarStore.isWaitingForResponse"
          @click="generateProjectsDataFile()"
        />
        <DsfrFileDownload
          v-if="file"
          :format="file.format"
          :size="`${file.size} bytes`"
          :href="file.href"
          :title="file.title"
          :download="file.title"
        />
      </div>
    </div>
    <DsfrTable
      :key="tableKey"
      data-testid="tableAdministrationProjects"
      :title="title"
    >
      <template #header>
        <tr>
          <td>
            <input
              type="checkbox"
              data-testid="select-all-cbx"
              :checked="isAllSelected"
              @click="selectAll"
            >
          </td>
          <td>Organisation</td>
          <td>Nom</td>
          <td>Souscripteur</td>
          <td>Status</td>
          <td>Date de création</td>
        </tr>
      </template>
      <tr
        v-if="isLoading || !projects.length"
      >
        <td colspan="7">
          {{ isLoading ? 'Chargement...' : 'Aucun projet trouvé' }}
        </td>
      </tr>
      <tr
        v-for="project in projectWithSelection.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))"
        v-else
        :key="project.id"
        :data-testid="`tr-${project.id}`"
        :selected="project.selected ? '' : null"
        class="cursor-pointer relative"
        :title="`Voir le tableau de bord du projet ${project.name}`"
        @click.stop="() => clickProject(project)"
      >
        <td
          @click.stop
        >
          <input
            type="checkbox"
            :data-testid="`select-${project.id}-cbx`"
            :checked="project.selected"
            @click="(event: any) => switchSelection(event.target.checked, project.id)"
          >
        </td>
        <td>
          {{ project.organization.label }}
        </td>
        <td>{{ project.name }}</td>
        <td>{{ project.owner.email }}</td>
        <td
          :title="`${statusDict.status[project.status].wording}\n${statusDict.locked[bts(project.locked)].wording}`"
        >
          <div
            class="grid md:grid-cols-2 gap-2"
          >
            <v-icon
              :name="statusDict.status[project.status].icon"
              :fill="statusDict.status[project.status].color"
            />
            <v-icon
              :name="statusDict.locked[bts(project.locked)].icon"
              :fill="statusDict.locked[bts(project.locked)].color"
            />
          </div>
        </td>
        <td
          :title="(new Date(project.createdAt)).toLocaleString()"
        >
          {{ timeAgo.format(new Date(project.createdAt)) }}
        </td>
      </tr>
    </DsfrTable>
    <div
      class="w-max flex gap-5 items-end"
    >
      <DsfrSelect
        v-model="selectedAction"
        data-testid="selectBulkAction"
        label="Traitement en masse"
        :options="bulkActions"
        class="mb-0 m-0"
        :attrs="{ class: 'mb-0' }"
      />
      <DsfrButton
        type="buttonType"
        data-testid="validateBulkAction"
        label="Valider"
        secondary
        class="mb-0"
        :disabled="!selectedProjects.length"
        @click="validateBulkAction"
      />
      <DsfrBadge
        v-if="selectedProjects.length"
        data-testid="projectSelectedCount"
        class="mb-2"
        :label="`${selectedProjects.length} projets sélectionnés`"
      />
    </div>
  </div>
</template>

<style scoped>
tr[selected]{
  background-color: var(--background-action-low-blue-france-active) !important;
}

tr:nth-child(2n)[selected]{
  background-color: var(--background-alt-blue-france-active) !important;
}
</style>
