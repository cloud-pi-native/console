<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import type { ArrayElement, ProjectV2, projectContract } from '@cpn-console/shared'
import { bts, projectStatus, statusDict } from '@cpn-console/shared'
import TimeAgo from 'javascript-time-ago'
import fr from 'javascript-time-ago/locale/fr'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useProjectStore } from '@/stores/project.js'
import router from '@/router/index.js'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { getRandomId } from '@/utils/func.js'

const userPrefStore = useUserPreferenceStore()
const projectStore = useProjectStore()
const snackbarStore = useSnackbarStore()

type FileForDownload = File & {
  href?: string
  format?: string
  title?: string
}

const tableKey = ref(getRandomId('table'))
const isLoading = ref(true)
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

const selectedProjectIds = ref<ProjectV2['id'][]>([])
const projects = ref<(ProjectV2)[]>([])

const projectWithSelection = computed(() => sort(projects.value.map(project => ({ ...project, selected: selectedProjectIds.value.includes(project.id) }))))
const selectedProjects = computed(() => projectWithSelection.value.filter(project => project.selected))

const isAllSelected = computed<boolean>(() => {
  return !!selectedProjects.value.length && selectedProjects.value.length === projects.value.length
})

function selectAll() {
  if (isAllSelected.value) {
    selectedProjectIds.value = []
  } else {
    selectedProjectIds.value = projects.value.map(({ id }) => id)
  }
}

// SORT
function sort<P extends ProjectV2>(projects: P[]): P[] {
  for (const sortItem of userPrefStore.sorts) {
    projects.sort((p1, p2) => {
      if (sortItem.field === 'ownerEmail') {
        return p2.owner.email.localeCompare(p1.owner.email) * (sortItem.inverted ? 1 : -1)
      }
      return String(p2[sortItem.field]).localeCompare(String(p1[sortItem.field])) * (sortItem.inverted ? 1 : -1)
    })
  }
  return projects
}

const chooseSort = userPrefStore.chooseSort

// FILTER
const statusOptions = ref(projectStatus.slice(0, -1).map(status => ({
  value: status,
  label: statusDict.status[status],
})))

const lockOptions = ref([{
  value: 'false',
  label: statusDict.locked.false,
}, {
  value: 'true',
  label: statusDict.locked.true,
}])

const versionWording: Record<Version, string> = {
  any: 'N\'importe',
  last: 'Dernière version',
  outdated: 'Obsolète',
}

const versionOptions = ref(Object.entries(versionWording).map(entry => ({ value: entry[0], text: entry[1] })))

async function getProjects() {
  queryChanged.value = false
  isLoading.value = true
  try {
    projects.value = await projectStore.listProjects({
      filter: 'all',
      statusIn: userPrefStore.statusChoice.join(','),
      ...userPrefStore.projectSearchText && { search: userPrefStore.projectSearchText.toLowerCase() },
      ...userPrefStore.lockChoice.length === 1 && { locked: userPrefStore.lockChoice[0] === 'true' },
      lastSuccessProvisionningVersion: userPrefStore.versionChoice !== 'any' ? userPrefStore.versionChoice : undefined,
    }).then(sort)
  } finally {
    isLoading.value = false
    tableKey.value = getRandomId('table')
  }
}

async function goToProject(projectSlug: string) {
  router.push({
    name: 'AdminProject',
    params: { slug: projectSlug },
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

const lastActiveSelectionId = ref<ProjectV2['id']>()
const lastActiveSelectionIndex = computed(() => projectWithSelection.value.findIndex(p => p.id === lastActiveSelectionId.value))

function clickProject(project: ArrayElement<typeof projectWithSelection.value>, event: MouseEvent) {
  if (project.selected && !event.shiftKey)
    return switchSelection(false, project.id)
  if (selectedProjects.value.length || event.shiftKey) {
    if (lastActiveSelectionIndex.value >= 0) {
      const selectedIndex = projectWithSelection.value.findIndex(p => p.id === project.id)
      for (let i = Math.min(selectedIndex, lastActiveSelectionIndex.value); i < Math.max(selectedIndex, lastActiveSelectionIndex.value); i++) {
        switchSelection(true, projectWithSelection.value[i].id)
      }
    }
    lastActiveSelectionId.value = project.id
    return switchSelection(true, project.id)
  }
  if (project.status === 'archived')
    return snackbarStore.setMessage('Le projet est archivé, pas d\'action possible', 'info')
  return goToProject(project.slug)
}

function switchSelection(checked: boolean, id: ProjectV2['id']) {
  selectedProjectIds.value = selectedProjectIds.value.filter(projectId => projectId !== id)
  if (checked) {
    selectedProjectIds.value.push(id)
  }
}
</script>

<template>
  <div
    class="relative"
  >
    <div
      class="grid grid-cols-3 justify-between gap-5 items-start mb-5"
    >
      <DsfrMultiselect
        id="statusSelector"
        v-model="userPrefStore.statusChoice"
        :options="statusOptions"
        label="Statut"
        :search="false"
        select-all
        :filtering-keys="['label']"
        id-key="value"
        @update:model-value="queryChanged = true"
      >
        <template #checkbox-label="{ option }">
          <span>
            <v-icon
              :name="option.label.icon"
              :fill="option.label.color"
            />{{ option.label.wording }}
          </span>
        </template>
      </DsfrMultiselect>
      <DsfrMultiselect
        id="lockSelector"
        v-model="userPrefStore.lockChoice"
        :options="lockOptions"
        label="Verrouillage"
        :search="false"
        select-all
        :filtering-keys="['label']"
        id-key="value"
        @update:model-value="queryChanged = true"
      >
        <template #checkbox-label="{ option }">
          <span>
            <v-icon
              :name="option.label.icon"
              :fill="option.label.color"
            />{{ option.label.wording }}
          </span>
        </template>
      </DsfrMultiselect>
      <div
        class="place-self-end flex gap-4 justify-start"
      >
        <DsfrFileDownload
          v-if="file"
          :format="file.format"
          :size="`${file.size} bytes`"
          :href="file.href"
          :title="file.title"
          :download="file.title"
        />
        <DsfrButton
          data-testid="download-btn"
          title="Exporter les données de tous les projets"
          secondary
          icon-only
          icon="ri:file-download-line"
          :disabled="snackbarStore.isWaitingForResponse"
          @click="generateProjectsDataFile()"
        />
      </div>
      <DsfrSelect
        v-model="userPrefStore.versionChoice"
        :options="versionOptions"
        label="Version"
        @update:model-value="queryChanged = true"
      />
      <DsfrInputGroup
        v-model="userPrefStore.projectSearchText"
        data-testid="projectsSearchInput"
        label-visible
        placeholder="Recherche textuelle"
        label="Recherche"
        class="mb-0"
        @update:model-value="queryChanged = true"
        @keyup.enter="getProjects"
      />
      <DsfrButton
        class="self-end"
        label="Rechercher"
        data-testid="projectsSearchBtn"
        v-bind="{ tertiary: !queryChanged, secondary: queryChanged }"
        @click="getProjects"
      />
    </div>
  </div>
  <DsfrTable
    :key="tableKey"
    data-testid="tableAdministrationProjects"
    :title="`${title}: ${projects.length} ${selectedProjects.length ? `(${selectedProjects.length} sélectionnés)` : ''}`"
  >
    <template #header>
      <tr>
        <td>
          <input
            type="checkbox"
            data-testid="select-all-cbx"
            :checked="!!projectWithSelection.length && isAllSelected"
            @click="selectAll"
          >
        </td>
        <td @click="chooseSort('slug', $event)">
          <v-icon
            v-if="userPrefStore.sorts.some(item => item.field === 'slug')"
            :name=" userPrefStore.sorts.some(item => item.field === 'slug' && item.inverted) ? 'ri:sort-desc' : 'ri:sort-asc'"
          />
          Slug
        </td>
        <td @click="chooseSort('name', $event)">
          <v-icon
            v-if="userPrefStore.sorts.some(item => item.field === 'name')"
            :name=" userPrefStore.sorts.some(item => item.field === 'name' && item.inverted) ? 'ri:sort-desc' : 'ri:sort-asc'"
          />Nom
        </td>
        <td @click="chooseSort('ownerEmail', $event)">
          <v-icon
            v-if="userPrefStore.sorts.some(item => item.field === 'ownerEmail')"
            :name=" userPrefStore.sorts.some(item => item.field === 'ownerEmail' && item.inverted) ? 'ri:sort-desc' : 'ri:sort-asc'"
          />Souscripteur
        </td>
        <td @click="chooseSort('status', $event)">
          <v-icon
            v-if="userPrefStore.sorts.some(item => item.field === 'status')"
            :name=" userPrefStore.sorts.some(item => item.field === 'status' && item.inverted) ? 'ri:sort-desc' : 'ri:sort-asc'"
          />Status
        </td>
        <td @click="chooseSort('lastSuccessProvisionningVersion', $event)">
          <v-icon
            v-if="userPrefStore.sorts.some(item => item.field === 'lastSuccessProvisionningVersion')"
            :name=" userPrefStore.sorts.some(item => item.field === 'lastSuccessProvisionningVersion' && item.inverted) ? 'ri:sort-desc' : 'ri:sort-asc'"
          />Version
        </td>
        <td @click="chooseSort('createdAt', $event)">
          <v-icon
            v-if="userPrefStore.sorts.some(item => item.field === 'createdAt')"
            :name=" userPrefStore.sorts.some(item => item.field === 'createdAt' && item.inverted) ? 'ri:sort-desc' : 'ri:sort-asc'"
          />Date de création
        </td>
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
      v-for="project in projectWithSelection"
      v-else
      :key="project.id"
      :data-testid="`tr-${project.id}`"
      :selected="project.selected ? '' : null"
      class="cursor-pointer relative"
      :title="`Voir le tableau de bord du projet ${project.name}`"
      @click.stop="clickProject(project, $event)"
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
      <td class="unselectable">
        {{ project.slug }}
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
      <td>{{ project.lastSuccessProvisionningVersion ?? '-' }}</td>
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
</template>

<style scoped>
.fr-select-group, .fr-input-group {
  margin-bottom: 0 !important;
}

tr[selected]{
  background-color: var(--background-action-low-blue-france-active) !important;
}

tr:nth-child(2n)[selected]{
  background-color: var(--background-alt-blue-france-active) !important;
}

td, td * {
  user-select: none;
}
</style>
