<script lang="ts" setup>
import { useProjectStore } from '@/stores/project.js'
import { useProjectMemberStore } from '@/stores/project-member.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { Member, RoleBigint, type Role } from '@cpn-console/shared'

const projectMemberStore = useProjectMemberStore()
const projectStore = useProjectStore()
const snackbarStore = useSnackbarStore()
const selectedId = ref<string>()

type RoleItem = Omit<Role, 'permissions'> & { permissions: bigint, memberCounts: number, isEveryone: boolean }

const roleList = computed((): RoleItem[] => {
  if (!projectStore.selectedProject) return []
  const roles = projectStore.selectedProject.roles.map(role => ({
    ...role,
    memberCounts: projectStore.selectedProject?.members.filter(member => member.roleIds.includes(role.id)).length ?? 0,
    isEveryone: false,
    permissions: BigInt(role.permissions),
  }))
  roles.push({
    id: 'everyone',
    memberCounts: projectStore.selectedProject.members.length ?? 0,
    name: 'Tout le monde',
    permissions: BigInt(projectStore.selectedProject.everyonePerms),
    position: 1000,
    isEveryone: true,
  })
  return roles
})

const selectedRole = computed(() => roleList.value.find(({ id }) => id === selectedId.value))

const addRole = async () => {
  if (!projectStore.selectedProject) return
  projectStore.selectedProject.roles = await projectStore.createRole(projectStore.selectedProject.id, {
    name: 'Nouveau rôle',
    permissions: 0n.toString(),
  })
  snackbarStore.setMessage('Rôle ajouté', 'success')
  selectedId.value = projectStore.selectedProject.roles[projectStore.selectedProject.roles.length - 1].id
}

const deleteRole = async (roleId: Role['id']) => {
  if (!projectStore.selectedProject) return
  await projectStore.deleteRole(projectStore.selectedProject.id, roleId)
  projectStore.selectedProject.roles = projectStore.selectedProject.roles.filter(role => role.id !== roleId)
  snackbarStore.setMessage('Rôle supprimé', 'success')
  selectedId.value = undefined
}

const updateMember = async (checked: boolean, userId: Member['userId']) => {
  if (!projectStore.selectedProject || !selectedRole.value) return
  const matchingMember = projectStore.selectedProject.members.find(member => member.userId === userId)
  if (!matchingMember) return

  const newRoleList = checked
    ? matchingMember.roleIds.concat(selectedRole.value.id)
    : matchingMember.roleIds.filter(id => id !== selectedRole.value?.id)

  projectStore.selectedProject.members = await projectMemberStore.patchMembers(projectStore.selectedProject.id, [{ userId, roles: newRoleList }])
  snackbarStore.setMessage('Rôle mis à jour', 'success')
}

const saveRole = async (role: Omit<RoleBigint, 'position'>) => {
  if (role.id === 'everyone') return saveEveryoneRole(role)
  if (!projectStore.selectedProject || !selectedRole.value) return
  projectStore.selectedProject.roles = await projectStore.patchRoles(projectStore.selectedProject.id, [{
    id: selectedRole.value.id,
    permissions: role.permissions.toString(),
    name: role.name,
  }])
}

const saveEveryoneRole = async (role: { permissions: bigint }) => {
  if (!projectStore.selectedProject) return
  await projectStore.updateProject(projectStore.selectedProject.id, {
    everyonePerms: role.permissions.toString(),
  })
  await projectStore.listProjects()
}

const cancel = () => selectedId.value = undefined

</script>

<template>
  <DsoSelectedProject />
  <template
    v-if="projectStore.selectedProject"
  >
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
            label="Ajouter un rôle"
            data-testid="addRoleBtn"
            :class="selectedId ? 'w-11/12': ''"
            secondary
            @click="addRole()"
          />
          <button
            v-for="role in roleList"
            :key="role.id"
            :data-testid="`${role.id}-tab`"
            :class="`text-align-left cursor-pointer mt-3 grid grid-flow-col fr-btn text-wrap truncate ${selectedId ? 'grid-cols-1': 'grid-cols-2'} ${selectedId === role.id ? 'fr-btn--primary w-full': 'fr-btn--tertiary w-11/12'}`"
            @click="selectedId = selectedId === role.id ? undefined : role.id"
          >
            {{ role.name }}
            <div
              v-if="!selectedId"
              class="text-wrap truncate text-right grow-0"
            >
              <span>{{ role.memberCounts }}</span>
              <v-icon
                class="ml-4"
                name="ri-team-line"
              />
            </div>
          </button>
        </div>
      </div>
      <ProjectRoleForm
        v-if="selectedRole"
        :id="selectedRole.id"
        :key="selectedRole.id"
        class="md:w-6/8 w-full"
        :name="selectedRole.name"
        :permissions="BigInt(selectedRole.permissions)"
        :project-id="projectStore.selectedProject.id"
        :is-everyone="selectedRole.isEveryone"
        :all-members="projectStore.selectedProject.members"
        @delete="deleteRole(selectedRole.id)"
        @update-member-roles="(checked: boolean, userId: Member['userId']) => updateMember(checked, userId)"
        @save="(role: Omit<RoleBigint, 'position'>) => saveRole(role)"
        @cancel="() => cancel()"
      />
    </div>
  </template>
  <ErrorGoBackToProjects
    v-else
  />
</template>
