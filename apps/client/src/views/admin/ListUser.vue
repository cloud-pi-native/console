<script setup>
import { onMounted, ref } from 'vue'
import { useAdminUserStore } from '@/stores/admin/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { formatDate } from '@dso-console/shared'

const adminUserStore = useAdminUserStore()

const snackbarStore = useSnackbarStore()

const allUsers = ref([])

const title = 'Liste des utilisateurs'
const headers = [
  'Identifiant',
  'Prénom',
  'Nom',
  'E-mail',
  'Création',
  'Modification',
]
const rows = ref([])

const copyContent = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    snackbarStore.setMessage('Donnée copié', 'success')
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

const getAllUsers = async () => {
  try {
    allUsers.value = await adminUserStore.getAllUsers()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

onMounted(async () => {
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
})
</script>

<template>
  <DsfrTable
    data-testid="tableAdministrationUsers"
    :title="title"
    :headers="headers"
    :rows="rows"
  />
</template>
