<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import { type AllUsers, type Role, formatDate } from '@cpn-console/shared'
import { useAdminRoleStore } from '@/stores/admin-role.js'
import { copyContent } from '@/utils/func.js'
import { useUsersStore } from '@/stores/users.js'

const adminRoleStore = useAdminRoleStore()
const usersStore = useUsersStore()
const adminRoles = ref<Role[]>([])
const allUsers = ref<AllUsers>([])

const inputSearchText = ref('')
const isLoading = ref(true)
const displayId = ref(false)
const hideBots = ref(false)

const sort = ref<{ method: string, desc: boolean }>({
  method: 'createdAt',
  desc: true,
})

const sortOptions: { text: string, value: string, selected?: true }[] = [{
  text: 'Date de création \u2B06\uFE0F',
  value: 'createdAt',
}, {
  text: 'Date de création \u2B07\uFE0F',
  value: 'createdAt:D',
  selected: true,
}, {
  text: 'Prénom, alphabétique \u2B06\uFE0F',
  value: 'firstName',
}, {
  text: 'Prénom, alphabétique \u2B07\uFE0F',
  value: 'firstName:D',
}, {
  text: 'Nom, alphabétique \u2B06\uFE0F',
  value: 'lastName',
}, {
  text: 'Nom, alphabétique \u2B07\uFE0F',
  value: 'lastName:D',
}, {
  text: 'Email, alphabétique \u2B06\uFE0F',
  value: 'email',
}, {
  text: 'Email, alphabétique \u2B07\uFE0F',
  value: 'email:D',
}]

const sortKey = computed<'email' | 'lastName' | 'firstName'>(() => sort.value.method.split(':')[0] as 'email' | 'lastName' | 'firstName')
function selectSort(value: string) {
  sort.value = {
    desc: value.endsWith(':D'),
    method: value,
  }
}

const userRows = computed(() => {
  let users = allUsers.value
  if (sort.value.desc) {
    users = users.toReversed()
  }
  if (hideBots.value) {
    users = users.filter(user => user.type === 'human')
  }
  let userRows = users
    .map((user) => {
      const fullName = `${user.firstName} ${user.lastName}`
      return {
        ...user,
        fullName,
        roleNames: adminRoleStore.roles.filter(({ id }) => user.adminRoleIds.includes(id)).map(({ name }) => name),
        bgColor: textToHSL(fullName),
      }
    })

  if (!inputSearchText.value) return userRows
  const input = inputSearchText.value.toLowerCase()
  userRows = userRows.filter((row) => {
    if (displayId.value && row.id.toLowerCase().includes(input)) return true
    if (row.email.toLowerCase().includes(input)) return true
    if (row.firstName.toLowerCase().includes(input)) return true
    if (row.lastName.toLowerCase().includes(input)) return true
    if (row.fullName.toLowerCase().includes(input)) return true
    if (row.type.toLowerCase().includes(input)) return true
    if (row.roleNames.join(' ').toLowerCase().includes(input)) return true
    return false
  })
  return userRows
})

function textToHSL(text: string): string {
  const hue = (text.charCodeAt(Math.min(text.length - 1, 2)) * text.charCodeAt(Math.min(text.length - 1)) * text.charCodeAt(Math.min(text.length - 1, 5))) % 255
  return `hsl(${hue} 80% 40%)`
}

onBeforeMount(async () => {
  if (!adminRoleStore.roles.length) {
    adminRoles.value = await adminRoleStore.listRoles()
  }
  allUsers.value = await usersStore.listUsers({})
  isLoading.value = false
})
</script>

<template>
  <div class="relative">
    <h2>Liste des utilisateurs</h2>
    <div
      class="flex <xl:flex-col flex-row gap-2 w-full gap-5"
    >
      <DsfrCallout
        class="h-min w-auto"
      >
        <DsfrSelect
          v-model="sort"
          data-testid="tableAdministrationUsersSort"
          label="Tri"
          :options="sortOptions"
          @update:model-value="(value: string) => selectSort(value)"
        />
        <DsfrInputGroup
          v-model="inputSearchText"
          data-testid="tableAdministrationUsersSearch"
          label="Rechercher"
          label-visible
          placeholder="Recherche..."
        />
        <DsfrCheckbox
          id="tableAdministrationUsersDisplayId"
          v-model="displayId"
          label="Afficher les identifiants"
          small
          @update:model-value="(value: boolean) => displayId = value"
        />
        <DsfrCheckbox
          id="tableAdministrationUsersHideBots"
          v-model="hideBots"
          label="Masquer les comptes techniques"
          small
          @update:model-value="(value: boolean) => hideBots = value"
        />
      </DsfrCallout>
      <div
        class="relative"
      >
        <DsfrTable
          data-testid="tableAdministrationUsers"
          class="w-max my-0"
          no-caption
          title=""
        >
          <template #header>
            <tr>
              <th scope="col" colspan="2">
                Rôles
              </th>
              <th scope="col">
                Type
              </th>
              <th
                scope="col"
              >
                Date de création
              </th>
              <th
                scope="col"
              >
                Dernière connexion
              </th>
            </tr>
          </template>
          <tr
            v-for="user in userRows.toSorted((a, b) => a[sortKey].toLowerCase().localeCompare(b[sortKey].toLowerCase()) * (sort.desc ? -1 : 1))"
            :key="user.id"
            :data-testid="`user-${user.id}`"
          >
            <td>
              <div
                class="rounded-full h-10 w-10 text-center content-center font-extrabold text-lg text-slate-100 self-start"
                :style="`background-color: ${user.bgColor};`"
              >
                {{ user.firstName[0].toUpperCase() + user.lastName[0].toUpperCase() }}
              </div>
            </td>
            <td
              class="grid w-max gap-3"
            >
              <div>
                <span class="text-xl">{{ user.fullName }}</span>
              </div>
              <code
                title="Copier l'email"
                class="fr-text-default--info text-xs cursor-pointer"
                :onClick="() => copyContent(user.email)"
              >
                {{ user.email }}
              </code><br>
              <code
                v-if="displayId"
                title="Copier l'id"
                class="fr-text-default--info text-xs cursor-pointer"
                :onClick="() => copyContent(user.id)"
              >
                {{ user.id }}
              </code>
            </td>
            <td
              :data-testid="`${user.id}-roles`"
            >
              <DsfrTag
                v-for="role in user.roleNames"
                :key="role"
                :label="role"
              />
            </td>
            <td>
              <DsfrTag
                v-if="user.type !== 'human'"
                :label="user.type"
              />
            </td>
            <td
              :title="(new Date(user.createdAt)).toLocaleString()"
            >
              {{ formatDate(user.createdAt) }}
            </td>
            <td
              :title="user.lastLogin ? (new Date(user.createdAt)).toLocaleString() : ''"
            >
              {{ user.lastLogin ? formatDate(user.lastLogin) : 'Jamais' }}
            </td>
          </tr>
          <tr
            v-if="userRows.length === 0"
          >
            <td colspan="10">
              Aucun utilisateur ne correspond à votre recherche
            </td>
          </tr>
        </DsfrTable>
        <Loader
          v-if="isLoading"
          cover
        />
      </div>
    </div>
  </div>
</template>
