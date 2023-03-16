<script setup>
import { onMounted, ref } from 'vue'
import { useAdminUserStore } from '@/stores/admin/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { formatDate } from '@/utils/date.js'

const adminUserStore = useAdminUserStore()

const snackbarStore = useSnackbarStore()

const allUsers = ref([])

const title = 'Liste des utilisateurs'
const headers = [
  'Prénom',
  'Nom',
  'E-mail',
  'Création',
  'Modification',
]
const rows = ref([])

const getAllUsers = async () => {
  try {
    allUsers.value = await adminUserStore.getAllUsers()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

onMounted(async () => {
  await getAllUsers()
  rows.value = allUsers.value?.map(({ firstName, lastName, email, createdAt, updatedAt }) => ([
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
