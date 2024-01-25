<script lang="ts" setup>
import { onBeforeMount, ref, type Ref } from 'vue'
import { useAdminUserStore } from '@/stores/admin/user.js'
import { formatDate } from '@dso-console/shared'
import { copyContent } from '@/utils/func.js'
import { getRandomId } from '@gouvminint/vue-dsfr'

const adminUserStore = useAdminUserStore()

const allUsers: Ref<any[]> = ref([])

const title = 'Liste des utilisateurs'
const headers = [
  'Identifiant',
  'Prénom',
  'Nom',
  'E-mail',
  'Création',
  'Modification',
]
const rows: Ref<any[][]> = ref([])

const tableKey = ref(getRandomId('table'))

const getAllUsers = async () => {
  allUsers.value = await adminUserStore.getAllUsers()
}

onBeforeMount(async () => {
  await getAllUsers()
  rows.value = allUsers.value?.map(({ id, firstName, lastName, email, createdAt, updatedAt }) => ([
    {
      component: 'code',
      text: id,
      title: 'Copier l\'id',
      class: 'fr-text-default--info text-xs cursor-pointer',
      onClick: () => copyContent(id),
    },
    firstName,
    lastName,
    email,
    formatDate(createdAt),
    formatDate(updatedAt),
  ]))
  tableKey.value = getRandomId('table')
})
</script>

<template>
  <DsfrTable
    :key="tableKey"
    data-testid="tableAdministrationUsers"
    :title="title"
    :headers="headers"
    :rows="rows"
  />
</template>
