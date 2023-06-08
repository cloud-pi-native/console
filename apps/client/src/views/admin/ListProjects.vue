<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAdminProjectStore } from '@/stores/admin/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { formatDate, statusDict } from 'shared'
import { useOrganizationStore } from '@/stores/organization.js'

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
