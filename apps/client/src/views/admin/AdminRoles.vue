<script lang="ts" setup>
import { apiClient, extractData } from '@/api/xhr-client.js'
import { AdminRole, type Role } from '@cpn-console/shared'
import AdminRoleForm from '@/components/AdminRoleForm.vue'

const selectedId = ref<string>()
const memberCounts = ref<Record<string, number>>({})

type RoleItem = Omit<AdminRole, 'permissions'> & { permissions: bigint, memberCounts?: number }

const adminRoles = ref<(AdminRole)[]>([])

const roleList = computed((): RoleItem[] => adminRoles.value.map(role => ({
  ...role,
  permissions: BigInt(role.permissions),
  memberCounts: memberCounts.value[role.id],
})))

const selectedRole = computed(() => roleList.value.find(({ id }) => id === selectedId.value))

const addRole = async () => {
  adminRoles.value = await apiClient.AdminRoles.createAdminRole({
    body: {
      name: 'Nouveau rôle',
    },
  }).then(res => extractData(res, 201))
  selectedId.value = adminRoles.value[adminRoles.value.length - 1].id
}

const deleteRole = async (roleId: Role['id']) => {
  await apiClient.AdminRoles.deleteAdminRole({ params: { roleId } }).then(res => extractData(res, 200))

  adminRoles.value = adminRoles.value.filter(role => role.id !== roleId)
  selectedId.value = undefined
}

const saveRole = async (role: Pick<AdminRole, 'name' | 'oidcGroup' | 'permissions'>) => {
  if (!selectedRole.value) return
  adminRoles.value = await apiClient.AdminRoles.patchAdminRoles({
    body: [{
      id: selectedRole.value.id,
      permissions: role.permissions.toString(),
      name: role.name,
      oidcGroup: role.oidcGroup,
    }],
  }).then(res => extractData(res, 200))
}

const cancel = () => selectedId.value = undefined

onBeforeMount(async () => {
  const [counts, roles] = await Promise.all([
    apiClient.AdminRoles.adminRoleMemberCounts().then(res => extractData(res, 200)),
    apiClient.AdminRoles.listAdminRoles().then(res => extractData(res, 200)),
  ])
  memberCounts.value = counts
  adminRoles.value = roles
})
</script>

<template>
  <DsoSelectedProject />
  <div
    class="flex flex-row"
  >
    <div
      :class="`flex flex-col ${selectedId ? 'w-2/8 max-sm:hidden' : 'w-full'}`"
    >
      <div
        class="flex flex-col"
      >
        <DsfrButton
          type="buttonType"
          label="Ajouter un rôle"
          :class="selectedId ? 'w-11/12': ''"
          secondary
          @click="addRole()"
        />
        <button
          v-for="role in roleList"
          :key="role.id"
          :class="`text-align-left cursor-pointer mt-3 grid grid-flow-col fr-btn ${selectedId ? 'grid-cols-1': 'grid-cols-2'} ${selectedId === role.id ? 'fr-btn--primary w-full': 'fr-btn--tertiary w-11/12'}`"
          @click="selectedId = selectedId === role.id ? undefined : role.id"
        >
          <div
            class="text-wrap truncate "
            tertiary
          >
            {{ role.name }}
          </div>
          <div
            v-if="!selectedId"
            class="text-wrap truncate text-right grow-0"
          >
            <span>{{ role.memberCounts ?? '-' }}</span>
            <v-icon
              :class="`ml-4`"
              name="ri-team-line"
            />
          </div>
        </button>
      </div>
    </div>
    <AdminRoleForm
      v-if="selectedRole"
      :id="selectedRole.id"
      :key="selectedRole.id"
      class="md:w-6/8 w-full"
      :name="selectedRole.name"
      :permissions="BigInt(selectedRole.permissions)"
      :oidc-group="selectedRole.oidcGroup"
      @delete="deleteRole(selectedRole.id)"
      @save="(role: Pick<AdminRole, 'name' | 'oidcGroup' | 'permissions'>) => saveRole(role)"
      @cancel="() => cancel()"
    />
  </div>
</template>
