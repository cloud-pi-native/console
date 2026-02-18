<script lang="ts" setup>
import { PROJECT_PERMS, type Member, type ProjectRole, type ProjectRoleBigint, type Role, type RoleBigint } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'
import type { Project } from '@/utils/project-utils.js'

const props = defineProps<{
  project: Project
}>()

const snackbarStore = useSnackbarStore()

const selectedId = ref<string>()

type RoleItem = Omit<ProjectRole, 'permissions'> & { permissions: bigint, memberCounts: number, isEveryone: boolean }

const roleList = ref<RoleItem[]>([])

const selectedRole = computed(() => roleList.value.find(({ id }) => id === selectedId.value))

async function addRole() {
  const newRoles = await props.project.Roles.create({
    name: 'Nouveau rôle',
    permissions: PROJECT_PERMS.GUEST.toString(),
  })
  reload()
  snackbarStore.setMessage('Rôle ajouté', 'success')
  selectedId.value = newRoles[newRoles.length - 1].id
}

async function deleteRole(roleId: Role['id']) {
  await props.project.Roles.delete(roleId)
  reload()
  snackbarStore.setMessage('Rôle supprimé', 'success')
  selectedId.value = undefined
}

async function updateMember(checked: boolean, userId: Member['userId']) {
  if (!selectedRole.value) return
  const matchingMember = props.project.members.find(member => member.userId === userId)
  if (!matchingMember) return

  const newRoleList = checked
    ? matchingMember.roleIds.concat(selectedRole.value.id)
    : matchingMember.roleIds.filter(id => id !== selectedRole.value?.id)

  await props.project.Members.patch([{ userId, roles: newRoleList }])
  reload()
  snackbarStore.setMessage('Rôle mis à jour', 'success')
}

async function saveEveryoneRole(role: { permissions: bigint }) {
  await props.project.Commands.update({
    everyonePerms: role.permissions.toString(),
  })
  reload()
  snackbarStore.setMessage('Rôle mis à jour', 'success')
}

async function saveRole(role: Omit<ProjectRoleBigint, 'position' | 'projectId'>) {
  if (role.id === 'everyone') {
    await saveEveryoneRole(role)
    snackbarStore.setMessage('Rôle mis à jour', 'success')
    return
  }
  if (!selectedRole.value) return
  await props.project.Roles.patch([{
    id: selectedRole.value.id,
    permissions: role.permissions.toString(),
    name: role.name,
    oidcGroup: role.oidcGroup,
  }])
  reload()
  snackbarStore.setMessage('Rôle mis à jour', 'success')
}

function reload() {
  const roles = props.project.roles.map(role => ({
    ...role,
    memberCounts: props.project.members.filter(member => member.roleIds.includes(role.id)).length ?? 0,
    isEveryone: false,
    permissions: BigInt(role.permissions),
  }))
  roles.push({
    id: 'everyone',
    memberCounts: props.project.members.length ?? 0,
    name: 'Tout le monde',
    permissions: BigInt(props.project.everyonePerms),
    position: 1000,
    isEveryone: true,
    projectId: props.project.id,
  })
  roleList.value = roles
}

const cancel = () => selectedId.value = undefined

watch(props.project, reload, { immediate: true })
</script>

<template>
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
          :class="selectedId ? 'w-11/12' : ''"
          secondary
          @click="addRole"
        />
        <button
          v-for="role in roleList"
          :key="role.id"
          :data-testid="`${role.id}-tab`"
          :class="`text-align-left cursor-pointer mt-3 grid grid-flow-col fr-btn text-wrap truncate  w-full ${selectedId ? 'grid-cols-1' : 'grid-cols-2'} ${selectedId === role.id ? 'fr-btn--primary' : 'fr-btn--tertiary'}`"
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
              name="ri:team-line"
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
      :project-id="project.id"
      :is-everyone="selectedRole.isEveryone"
      :oidc-group="selectedRole.oidcGroup"
      :type="selectedRole.type"
      :all-members="project.members"
      @delete="deleteRole(selectedRole.id)"
      @update-member-roles="(checked: boolean, userId: Member['userId']) => updateMember(checked, userId)"
      @save="(role: Omit<RoleBigint, 'position'>) => saveRole(role)"
      @cancel="cancel"
    />
  </div>
</template>
