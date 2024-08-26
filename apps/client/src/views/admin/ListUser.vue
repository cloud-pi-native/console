<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import { type AllUsers, formatDate, sortArrByObjKeyAsc, type Role } from '@cpn-console/shared'
import { useProjectMemberStore } from '@/stores/project-member.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useAdminRoleStore } from '@/stores/admin-role.js'
import { copyContent } from '@/utils/func.js'

const adminRoleStore = useAdminRoleStore()
const projectMemberStore = useProjectMemberStore()
const snackbarStore = useSnackbarStore()
const adminRoles = ref<Role[]>([])
const allUsers = ref<AllUsers>([])

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

const userRows = computed(() => {
  const rows = sortArrByObjKeyAsc(allUsers.value, 'firstName')
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
          {
            component: 'p',
            text: adminRoleStore.roles.filter(({ id }) => adminRoleIds.includes(id)).map(({ name }) => name).join('\n') || '-',
            'data-testid': `${id}-roles`,
          },
          formatDate(createdAt),
          formatDate(updatedAt),
        ],
      }),
    )

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
})

onBeforeMount(async () => {
  snackbarStore.isWaitingForResponse = true
  if (!adminRoleStore.roles.length) {
    adminRoles.value = await adminRoleStore.listRoles()
  }
  allUsers.value = await projectMemberStore.getAllUsers()
  snackbarStore.isWaitingForResponse = false
})

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
        :rows="userRows"
      />
    </div>
    <LoadingCt
      v-if="snackbarStore.isWaitingForResponse"
      description="Récupération des utilisateurs"
    />
  </div>
</template>
