<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import { useAdminProjectStore } from '@/stores/admin/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { formatDate, statusDict, sortArrByObjKeyAsc } from '@dso-console/shared'
import { useAdminOrganizationStore } from '@/stores/admin/organization.js'
import { getRandomId } from '@gouvminint/vue-dsfr'

const adminProjectStore = useAdminProjectStore()
const adminOrganizationStore = useAdminOrganizationStore()

const snackbarStore = useSnackbarStore()

const allProjects = ref([])
const organizations = ref([])

const title = 'Liste des projets'
const headers = [
  'Organisation',
  'Nom',
  'Description',
  'Souscripteur',
  'Status',
  'Verrouillage',
  'Création',
  'Modification',
]
const rows = ref([])

const tableKey = ref(getRandomId('table'))

const setRows = () => {
  rows.value = allProjects.value.length
    ? sortArrByObjKeyAsc(allProjects.value, 'name')
      ?.map(({ organizationId, name, description, roles, status, locked, createdAt, updatedAt }) => ([
        organizations.value?.find(org => org.id === organizationId).label,
        name,
        description ?? '',
        roles[0].user.email,
        {
          component: 'v-icon',
          name: statusDict.status[status].icon,
          title: `Le projet ${name} est ${statusDict.status[status].wording}`,
          fill: statusDict.status[status].color,
        },
        {
          component: 'v-icon',
          name: statusDict.locked[locked].icon,
          title: `Le projet ${name} est ${statusDict.locked[locked].wording}`,
          fill: statusDict.locked[locked].color,
        },
        formatDate(createdAt),
        formatDate(updatedAt),
      ]),
      )
    : [[{
        text: 'Aucun projet existant',
        cellAttrs: {
          colspan: headers.length,
        },
      }]]
  tableKey.value = getRandomId('table')
}

const getAllProjects = async () => {
  try {
    allProjects.value = await adminProjectStore.getAllProjects()
    setRows()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

onBeforeMount(async () => {
  organizations.value = await adminOrganizationStore.getAllOrganizations()
  await getAllProjects()
})
</script>
<template>
  <DsfrTable
    :key="tableKey"
    data-testid="tableAdministrationProjects"
    :title="title"
    :headers="headers"
    :rows="rows"
  />
</template>
