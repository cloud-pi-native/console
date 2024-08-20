<script lang="ts" setup>
import { AdminRole, type Role } from '@cpn-console/shared'
import AdminRoleForm from '@/components/AdminRoleForm.vue'
import { useAdminRoleStore } from '@/stores/admin-role.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const adminRoleStore = useAdminRoleStore()
const snackbarStore = useSnackbarStore()

const selectedId = ref<string>()
type RoleItem = Omit<AdminRole, 'permissions'> & { permissions: bigint, memberCounts?: number }

const roleList = computed((): RoleItem[] => adminRoleStore.roles.map(role => ({
  ...role,
  permissions: BigInt(role.permissions),
  memberCounts: adminRoleStore.memberCounts[role.id],
})))

const selectedRole = computed(() => roleList.value.find(({ id }) => id === selectedId.value))

const addRole = async () => {
  await adminRoleStore.createRole()
  snackbarStore.setMessage('Rôle ajouté', 'success')

  selectedId.value = adminRoleStore.roles[adminRoleStore.roles.length - 1].id
}

const deleteRole = async (roleId: Role['id']) => {
  await adminRoleStore.deleteRole(roleId)
  await adminRoleStore.listRoles()
  snackbarStore.setMessage('Rôle supprimé', 'success')
  selectedId.value = undefined
}

const saveRole = async (role: Pick<AdminRole, 'name' | 'oidcGroup' | 'permissions'>) => {
  if (!selectedRole.value) return
  await adminRoleStore.patchRoles(
    [{
      id: selectedRole.value.id,
      permissions: role.permissions.toString(),
      name: role.name,
      oidcGroup: role.oidcGroup,
    }],
  )
  snackbarStore.setMessage('Rôle mis à jour', 'success')
}

const cancel = () => selectedId.value = undefined

onBeforeMount(async () => {
  if (!adminRoleStore.roles.length) {
    await adminRoleStore.listRoles()
  }
})

</script>

<template>
  <DsoSelectedProject />
  <div
    class="flex flex-row"
  >
    <div
      :class="`flex flex-col ${selectedId ? 'max-w-11em w-2/8 max-sm:hidden' : 'w-full'}`"
    >
      <div
        class="flex flex-col"
      >
        <DsfrButton
          label="Ajouter un rôle"
          data-testid="addRoleBtn"
          :class="selectedId ? 'w-11/12': ''"
          secondary
          @click="addRole()"
        />
        <button
          v-for="role in roleList"
          :key="role.id"
          :data-testid="`${role.name}-tab`"
          :class="`text-align-left cursor-pointer mt-3 grid grid-flow-col fr-btn text-wrap truncate ${selectedId ? 'grid-cols-1': 'grid-cols-2'} ${selectedId === role.id ? 'fr-btn--primary w-full': 'fr-btn--tertiary w-11/12'}`"
          @click="selectedId = selectedId === role.id ? undefined : role.id"
        >
          {{ role.name }}
          <template
            v-if="!selectedId"
          >
            <div
              class="text-wrap truncate text-right grow-0"
            >
              <template
                v-if="role.oidcGroup"
              >
                <span>oidc</span>
                <v-icon
                  :class="`ml-4`"
                  name="ri-user-shared-2-line"
                />
              </template>
              <template v-else>
                <span>
                  {{ (role.memberCounts ?? '-') }}
                </span>
                <v-icon
                  :class="`ml-4`"
                  name="ri-team-line"
                />
              </template>
            </div>
          </template>
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
