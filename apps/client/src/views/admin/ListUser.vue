<script lang="ts" setup>
import { computed, onBeforeMount, ref } from 'vue'
import type { Role, User } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useAdminRoleStore } from '@/stores/admin-role.js'
import { useUsersStore } from '@/stores/users.js'
import { copyContent } from '@/utils/func.js'
import router from '@/router/index.js'

const adminRoleStore = useAdminRoleStore()
const usersStore = useUsersStore()
const snackbarStore = useSnackbarStore()
const adminRoles = ref<Role[]>([])
const users = ref<User[]>([])
const page = ref(0)
const perPage = ref(20)
const total = ref(0)
const displayLongTime = ref(false)

const searchSearch = ref<string>()

type SortableKey = keyof Pick<User, 'createdAt' | 'lastLogin' | 'email' | 'firstName' | 'lastName'>
const sort = ref<SortableKey>('createdAt')
const sortDesc = ref(false)
const hideBots = ref(true)
const displayId = ref(false)

const sortOptions: { text: string, value: SortableKey, selected?: true }[] = [{
  text: 'Dernière connexion',
  value: 'lastLogin',
  selected: true,
}, {
  text: 'Date de création',
  value: 'createdAt',
}, {
  text: 'Prénom',
  value: 'firstName',
}, {
  text: 'Nom',
  value: 'lastName',
}, {
  text: 'Email',
  value: 'email',
}]

const usersRows = computed(() => {
  return users.value
    .map((user) => {
      return {
        ...user,
        roleNames: adminRoleStore.roles.filter(({ id }) => user.adminRoleIds.includes(id)).map(({ name }) => name),
      }
    })
})

onBeforeMount(async () => {
  if (!adminRoleStore.roles.length) {
    adminRoles.value = await adminRoleStore.listRoles()
  }
  await getUsers()
})

const dateLocaleOptions = {
  year: '2-digit',
  month: 'numeric',
  day: 'numeric',
} as const

async function getUsers() {
  snackbarStore.isWaitingForResponse = true
  try {
    const data = await usersStore.listUsers({
      search: searchSearch.value || undefined,
      type: hideBots.value ? 'human' : undefined,
      orderBy: sort.value,
      order: sortDesc.value ? 'desc' : 'asc',
      page: page.value.toString(),
      perPage: perPage.value.toString(),
    })
    users.value = data.data
    page.value = Math.floor(data.offset / perPage.value)
    total.value = data.total
  } finally {
    snackbarStore.isWaitingForResponse = false
  }
}
</script>

<template>
  <div class="relative">
    <div
      class="flex flex-col gap-2 w-full gap-5"
    >
      <div class="flex flex-auto-row gap-10">
        <div class="flex flex-row items-end">
          <input
            v-model="searchSearch"
            class="fr-input"
            data-testid="tableAdministrationUsersSearch"
            label="Rechercher"
            :label-visible="false"
            placeholder="Recherche..."
            @keyup.enter="getUsers"
          >
          <DsfrButton
            label="Rechercher"
            icon-only
            icon="ri-search-line"
            data-testid="usersSearchBtn"
            primary
            @click="() => getUsers()"
          />
        </div>
        <div class="flex flex-row items-end">
          <DsfrSelect
            v-model="sort"
            data-testid="tableAdministrationUsersSort"
            :label-visible="false"
            :options="sortOptions"
            class="mb-0 mt-0"
            @keyup.enter="getUsers"
            @update:model-value="(value: SortableKey) => { sort = value; getUsers() }"
          />
          <DsfrButton
            no-label
            icon-only
            :icon="sortDesc ? 'ri-sort-desc' : 'ri-sort-asc'"
            @click="() => { sortDesc = !sortDesc; getUsers() }"
          />
        </div>
      </div>
      <div class="flex flex-row">
        <DsfrCheckbox
          id="hideBots"
          v-model="hideBots"
          label="Masquer les comptes techniques"
          value="hideBots"
          name="hideBots"
          legend=""
          small
          inline
          @update:model-value="(event: boolean) => { hideBots = event; getUsers() }"
        />
        <DsfrCheckbox
          id="displayId"
          v-model="displayId"
          label="Afficher les identifiants"
          value="displayId"
          name="displayId"
          legend=""
          small
          inline
          @update:model-value="(event: boolean) => { displayId = event }"
        />
      </div>
      <div
        class="flex flex-col gap-3 h-min w-min"
      >
        <PaginationCt
          :length="total"
          :page="page"
          :step="perPage"
          @set-page="(targetPage: number) => { page = targetPage ; getUsers() }"
        />
        <DsfrTable
          title="Liste des utilisateurs"
          class="border-spacing-x-0 w-max"
          no-caption
        >
          <template #header>
            <tr
              class=" w-full"
            >
              <td />
              <td>Utilisateur</td>
              <td>Rôles</td>
              <td>Crée le</td>
              <td>Dernière co</td>
            </tr>
          </template>
          <tr v-if="snackbarStore.isWaitingForResponse">
            <td colspan="5">
              Chargment...
            </td>
          </tr>
          <tr v-if="!usersRows.length">
            <td colspan="5">
              Aucun utilisateur trouvé
            </td>
          </tr>
          <UserCt
            v-for="user in usersRows"
            v-else
            :key="user.id"
            :user="user"
            mode="full"
            recursive-slots
            :selectable="false"
            as-table-row
            class=" w-full"
            @click="router.push({ name: 'AdminUser', params: { id: user.id } })"
          >
            <template #extra>
              <td
                class="p-2"
              >
                <div
                  class="flex justify-self-end self-start gap-1"
                >
                  <DsfrTag
                    v-for="role in user.roleNames"
                    :key="role"
                    class="shadow shrink"
                    :label="role"
                    :small="displayId"
                  />
                </div>
                <div
                  v-if="displayId"
                  class="grow"
                >
                  <span>id: </span><code
                    title="Copier l'id"
                    class="fr-text-default--info text-xs cursor-pointer"
                    :onClick="() => copyContent(user.id)"
                  >
                    {{ user.id }}
                  </code>
                </div>
              </td>

              <td
                class="p-2 min-w-20"
                :title="(new Date(user.createdAt)).toLocaleString(undefined, dateLocaleOptions)"
                @click="displayLongTime = !displayLongTime"
              >
                {{ (new Date(user.createdAt)).toLocaleString(undefined, displayLongTime ? undefined : dateLocaleOptions) }}
              </td>
              <td
                class="p-2 min-w-20"
                :title="user.lastLogin ? (new Date(user.lastLogin)).toLocaleString() : 'Jamais'"
              >
                {{ user.lastLogin ? (new Date(user.lastLogin)).toLocaleString(undefined, displayLongTime ? undefined : dateLocaleOptions) : 'Jamais' }}
              </td>
            </template>
          </UserCt>
        </DsfrTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fr-select-group {
  margin-bottom: 0 !important;
}

.fr-checkbox-group {
  margin-bottom: 0 !important;
}

.fr-fieldset__element {
  margin-bottom: 0 !important;
}
</style>
