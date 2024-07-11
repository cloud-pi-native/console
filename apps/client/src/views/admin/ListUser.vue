<script lang="ts" setup>
import { onBeforeMount, ref, watch } from 'vue'
import { type AllUsers, formatDate, sortArrByObjKeyAsc } from '@cpn-console/shared'
import { useProjectUserStore } from '@/stores/project-user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { copyContent } from '@/utils/func.js'
import { useUserStore } from '@/stores/user.js'
import type { Component, EmptyRow } from './ListProjects.vue'

interface CheckboxEvent extends Event {
    target: HTMLInputElement;
}

type Row = {
  rowData: Array<string | Component>
}

const projectUserStore = useProjectUserStore()
const snackbarStore = useSnackbarStore()

const allUsers = ref<AllUsers>([])
const rows = ref<Row[]>([])
const inputSearchText = ref('')

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

const getAllUsers = async () => {
  allUsers.value = await projectUserStore.getAllUsers() ?? []
}

const filterRows = (rows: Row[]): Row[] | EmptyRow => {
  const returnRows = rows.filter(row => {
    if (!inputSearchText.value) return true
    return row.rowData.some(data => {
      if (typeof data === 'object') {
        return data.text?.toString().toLowerCase().includes(inputSearchText.value.toLocaleLowerCase())
      }
      return data.toString().toLowerCase().includes(inputSearchText.value.toLocaleLowerCase())
    })
  })
  if (!returnRows.length) {
    return [[{
      text: 'Aucun utilisateur trouvé',
      field: 'string',
      cellAttrs: {
        colspan: headers.length,
      },
    }]]
  }
  return returnRows
}

const setRows = () => {
  rows.value = sortArrByObjKeyAsc(allUsers.value, 'firstName')
    ?.map(({ id, firstName, lastName, email, isAdmin, createdAt, updatedAt }) => (
      {
        rowData: [
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
            onClick: async (event: CheckboxEvent) => {
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
          formatDate(createdAt),
          formatDate(updatedAt),
        ],
      }),
    )
}

onBeforeMount(async () => {
  snackbarStore.isWaitingForResponse = true
  await getAllUsers()
  setRows()
  snackbarStore.isWaitingForResponse = false
})

watch(allUsers, () => setRows())
</script>

<template>
  <div class="relative">
    <div
      class="flex flex-col gap-2 w-min"
    >
      <DsfrInputGroup
        v-model="inputSearchText"
        data-testid="tableAdministrationUsersSearch"
        label="Caractères à rechercher"
        label-visible
        hint="Toutes les colonnes contenant du texte sont incluses dans la recherche."
        placeholder="..."
      />
      <DsfrTable
        data-testid="tableAdministrationUsers"
        :title="title"
        :headers="headers"
        :rows="filterRows(rows)"
      />
    </div>
    <LoadingCt
      v-if="snackbarStore.isWaitingForResponse"
      description="Récupération des utilisateurs"
    />
  </div>
</template>
