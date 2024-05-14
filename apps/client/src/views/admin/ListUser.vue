<script lang="ts" setup>
import { onBeforeMount, ref, watch } from 'vue'
import { type AllUsers, formatDate } from '@cpn-console/shared'
import { useAdminUserStore } from '@/stores/admin/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { copyContent } from '@/utils/func.js'
import { useUserStore } from '@/stores/user.js'

const adminUserStore = useAdminUserStore()
const snackbarStore = useSnackbarStore()

const allUsers = ref<AllUsers>([])

const title = 'Liste des utilisateurs'
const headers = [
  'Identifiant',
  'Prénom',
  'Nom',
  'E-mail',
  'Administrateur',
  'Création',
  'Modification',
]

const setRows = () => allUsers.value.map(({ id, firstName, lastName, email, isAdmin, createdAt, updatedAt }) => ([
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
  {
    component: 'input',
    type: 'checkbox',
    checked: isAdmin,
    'data-testid': `${id}-is-admin`,
    class: 'fr-checkbox-group--sm',
    title: isAdmin ? `Retirer le rôle d'administrateur de ${email}` : `Donner le rôle d'administrateur à ${email}`,
    onClick: async (event: Event & { target: { checked: boolean }}) => {
      const value = event.target.checked
      if (value !== isAdmin) {
        await adminUserStore.updateUserAdminRole(id, value)
        snackbarStore.setMessage(value ? `Le rôle d'administrateur a été attribué à ${email}` : `Le rôle d'administrateur a été retiré à ${email}`, 'success')
        await getAllUsers()
        // Redirect user to home if he removed himself from admin group
        // TODO : router.push ne suffit pas, il faut un rechargement complet
        // instance keycloak ne semble pas au courant du changement de groupe, visible au reload

        // useUserStore().setUserProfile()
        // console.log(useUserStore().userProfile?.groups)

        // @ts-ignore
        if (useUserStore().userProfile?.id === id && !value) window.location = '/'
      }
    },
  },
  formatDate(createdAt ?? ''),
  formatDate(updatedAt ?? ''),
]))

const rows = ref<ReturnType<typeof setRows>>([])

const getAllUsers = async () => {
  allUsers.value = await adminUserStore.getAllUsers() ?? []
}

onBeforeMount(async () => {
  snackbarStore.isWaitingForResponse = true
  await getAllUsers()
  rows.value = setRows()
  snackbarStore.isWaitingForResponse = false
})

watch(allUsers, () => { rows.value = setRows() })
</script>

<template>
  <div class="relative">
    <DsfrTable
      data-testid="tableAdministrationUsers"
      :title="title"
      :headers="headers"
      :rows="rows"
    />
    <LoadingCt
      v-if="snackbarStore.isWaitingForResponse"
      description="Récupération des utilisateurs"
    />
  </div>
</template>
