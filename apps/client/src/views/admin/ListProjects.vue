<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import type { Organization, projectContract } from '@cpn-console/shared'
import { statusDict } from '@cpn-console/shared'
import TimeAgo from 'javascript-time-ago'
import fr from 'javascript-time-ago/locale/fr'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useOrganizationStore } from '@/stores/organization.js'
import { useQuotaStore } from '@/stores/quota.js'
import { useProjectStore } from '@/stores/project.js'
import { useStageStore } from '@/stores/stage.js'
import { bts } from '@/utils/func.js'
import router from '@/router/index.js'

const projectStore = useProjectStore()
const organizationStore = useOrganizationStore()
const snackbarStore = useSnackbarStore()
const quotaStore = useQuotaStore()
const stageStore = useStageStore()

type FileForDownload = File & {
  href?: string
  format?: string
  title?: string
}

const organizations = ref<Organization[]>([])
const tableKey = ref(getRandomId('table'))
const inputSearchText = ref('')
const activeFilter = ref('Non archivés')
const file = ref<FileForDownload | undefined>(undefined)
// Add locale-specific relative date/time formatting rules.
TimeAgo.addLocale(fr)

// Create relative date/time formatter.
const timeAgo = new TimeAgo('fr-FR')

const title = 'Liste des projets'
const headers = [
  'Organisation',
  'Nom',
  'Souscripteur',
  'Status',
  'Verrouillage',
  'Date de création',
]

type FilterMethods = Record<string, typeof projectContract.listProjects.query._type>
const filterMethods: FilterMethods = {
  Tous: { filter: 'all' },
  'Non archivés': { filter: 'all', statusNotIn: 'archived' },
  Archivés: { filter: 'all', statusIn: 'archived' },
  Échoués: { filter: 'all', statusIn: 'failed' },
  Vérrouillés: { filter: 'all', locked: true, statusNotIn: 'archived' },
}

const projectRows = computed(() => {
  let rows = projectStore.projects
    .map(({ id, organization, name, status, locked, createdAt, owner }) => (
      {
        status,
        locked,
        rowAttrs: {
          onClick: () => {
            if (status === 'archived') return snackbarStore.setMessage('Le projet est archivé, pas d\'action possible', 'info')
            selectProject(id)
          },
          class: 'cursor-pointer',
          title: `Voir le tableau de bord du projet ${name}`,
        },
        rowData: [
          organization.label,
          name,
          owner.email,
          {
            component: 'v-icon',
            name: statusDict.status[status].icon,
            title: `Le projet ${name} est ${statusDict.status[status].wording}`,
            fill: statusDict.status[status].color,
          },
          {
            component: 'v-icon',
            name: statusDict.locked[bts(locked)].icon,
            title: `Le projet ${name} est ${statusDict.locked[bts(locked)].wording}`,
            fill: statusDict.locked[bts(locked)].color,
          },
          {
            text: timeAgo.format(new Date(createdAt)),
            title: (new Date(createdAt)).toLocaleString(),
            component: 'span',
          },
        ],
      }),
    )
  if (inputSearchText.value) {
    rows = rows.filter((row) => {
      return row.rowData.some((data) => {
        if (typeof data === 'object') {
          return data.title?.toString().toLowerCase().includes(inputSearchText.value.toLocaleLowerCase()) || data.text?.toString().toLowerCase().includes(inputSearchText.value.toLocaleLowerCase())
        }
        return data.toString().toLowerCase().includes(inputSearchText.value.toLocaleLowerCase())
      })
    })
  }
  if (!rows.length) {
    return [[{
      field: 'string',
      text: 'Aucun projet trouvé',
      cellAttrs: {
        colspan: headers.length,
      },
    }]]
  }
  return rows
})

async function getAllProjects() {
  snackbarStore.isWaitingForResponse = true
  await projectStore.listProjects(filterMethods[activeFilter.value])
  tableKey.value = getRandomId('table')
  snackbarStore.isWaitingForResponse = false
}

async function selectProject(projectId: string) {
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
  organizations.value = await organizationStore.listOrganizations()
  await Promise.all([
    await stageStore.getAllStages(),
    await quotaStore.getAllQuotas(),
    await getAllProjects(),
  ])
})
</script>

<template>
  <div
    class="relative"
  >
    <div
      class="w-full flex gap-4 justify-end fr-mb-1w"
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
      <DsfrButton
        data-testid="refresh-btn"
        title="Rafraîchir la liste des projets"
        secondary
        icon-only
        icon="ri:refresh-fill"
        :disabled="snackbarStore.isWaitingForResponse"
        @click="async() => {
          await getAllProjects()
        }"
      />
    </div>
    <div
      class="flex"
    >
      <DsfrSelect
        v-model="activeFilter"
        select-id="tableAdministrationProjectsFilter"
        label="Filtre rapide"
        :options="Object.keys(filterMethods)"
        @update:model-value="getAllProjects()"
      />
      <DsfrInputGroup
        v-model="inputSearchText"
        data-testid="tableAdministrationProjectsSearch"
        label-visible
        placeholder="Recherche textuelle"
        label="Recherche"
        class="flex-1 pl-4"
      />
    </div>
    <DsfrTable
      :key="tableKey"
      data-testid="tableAdministrationProjects"
      :title="title"
      :headers="headers"
      :rows="projectRows"
    />
  </div>
</template>
