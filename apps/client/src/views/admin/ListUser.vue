<script lang="ts" setup>
import { onBeforeMount, ref, watch } from 'vue'
import { type AllUsers, formatDate, sortArrByObjKeyAsc, type Role } from '@cpn-console/shared'
import { useProjectUserStore } from '@/stores/project-user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { copyContent } from '@/utils/func.js'
import { useAdminRoleStore } from '@/stores/admin-role.js'
import type { Component, EmptyRow } from './ListProjects.vue'

const adminRoleStore = useAdminRoleStore()

const adminRoles = ref<Role[]>([])
onBeforeMount(async () => {
  if (adminRoleStore.roles.length) {
    adminRoles.value = await adminRoleStore.listAdminRoles()
  }
})

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
  'Rôles',
  'Création',
  'Modification',
]

const getAllUsers = async () => {
  allUsers.value = await projectUserStore.getAllUsers() ?? []
}

const filterRows = (rows: Row[]): Row[] | EmptyRow => {
  const returnRows = rows.filter((row) => {
    if (!inputSearchText.value) return true
    return row.rowData.some((data) => {
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
    ?.map(({ id, firstName, lastName, email, adminRoleIds, createdAt, updatedAt }) => (
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
          adminRoleStore.roles.filter(({ id }) => adminRoleIds.includes(id)).map(({ name }) => name).join('\n') || '-',
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
