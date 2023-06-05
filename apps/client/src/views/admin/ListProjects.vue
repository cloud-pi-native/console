<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAdminProjectStore } from '@/stores/admin/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { formatDate } from 'shared/src/utils/date.js'
import { useOrganizationStore } from '@/stores/organization.js'
import { projectDict } from 'shared/src/utils/const.js'

const adminProjectStore = useAdminProjectStore()
const organizationStore = useOrganizationStore()

const snackbarStore = useSnackbarStore()

const allProjects = ref([])
const organizations = computed(() => organizationStore.organizations)

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

const setRows = () => {
  rows.value = allProjects.value
    ?.sort((a, b) => a.name >= b.name ? 1 : -1)
    ?.map(({ organization, name, description, owner, status, locked, createdAt, updatedAt }) => ([
      organizations.value?.find(org => org.id === organization).label,
      name,
      description ?? '',
      owner.email,
      {
        component: 'v-icon',
        name: projectDict.status[status].icon,
        title: `Le projet ${name} est ${projectDict.status[status].wording}`,
        fill: projectDict.status[status].color,
      },
      {
        component: 'v-icon',
        name: projectDict.locked[locked].icon,
        title: `Le projet ${name} est ${projectDict.locked[locked].wording}`,
        fill: projectDict.locked[locked].color,
      },
      formatDate(createdAt),
      formatDate(updatedAt),
    ]))
}

const getAllProjects = async () => {
  try {
    allProjects.value = await adminProjectStore.getAllProjects()
    setRows()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

onMounted(async () => {
  await organizationStore.setOrganizations()
  await getAllProjects()
})
</script>
<template>
  <DsfrTable
    data-testid="tableAdministrationProjects"
    :title="title"
    :headers="headers"
    :rows="rows"
  />
</template>
