<script lang="ts" setup>
import { type Member, ProjectAuthorized, type ProjectV2, type Role, type RoleBigint } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps<{ projectId: ProjectV2['id'] }>()

const projectStore = useProjectStore()
const snackbarStore = useSnackbarStore()
const selectedId = ref<string>()
const project = computed(() => projectStore.projectsById[props.projectId])

type RoleItem = Omit<Role, 'permissions'> & { permissions: bigint, memberCounts: number, isEveryone: boolean }

const roleList = ref<RoleItem[]>([])

const selectedRole = computed(() => roleList.value.find(({ id }) => id === selectedId.value))

async function addRole() {
  const newRoles = await project.value.Roles.create({
    name: 'Nouveau rôle',
    permissions: 0n.toString(),
  })
  reload()
  snackbarStore.setMessage('Rôle ajouté', 'success')
  selectedId.value = newRoles[newRoles.length - 1].id
}

async function deleteRole(roleId: Role['id']) {
  await project.value.Roles.delete(roleId)
  reload()
  snackbarStore.setMessage('Rôle supprimé', 'success')
  selectedId.value = undefined
}

async function updateMember(checked: boolean, userId: Member['userId']) {
  if (!selectedRole.value) return
  const matchingMember = project.value.members.find(member => member.userId === userId)
  if (!matchingMember) return

  const newRoleList = checked
    ? matchingMember.roleIds.concat(selectedRole.value.id)
    : matchingMember.roleIds.filter(id => id !== selectedRole.value?.id)

  await project.value.Members.patch([{ userId, roles: newRoleList }])
  reload()
  snackbarStore.setMessage('Rôle mis à jour', 'success')
}

async function saveEveryoneRole(role: { permissions: bigint }) {
  await project.value.Commands.update({
    everyonePerms: role.permissions.toString(),
  })
  reload()
  snackbarStore.setMessage('Rôle mis à jour', 'success')
}

async function saveRole(role: Omit<RoleBigint, 'position'>) {
  if (role.id === 'everyone') {
    await saveEveryoneRole(role)
    snackbarStore.setMessage('Rôle mis à jour', 'success')
    return
  }
  if (!selectedRole.value) return
  await project.value.Roles.patch([{
    id: selectedRole.value.id,
    permissions: role.permissions.toString(),
    name: role.name,
  }])
  reload()
  snackbarStore.setMessage('Rôle mis à jour', 'success')
}

function reload() {
  const roles = project.value.roles.map(role => ({
    ...role,
    memberCounts: project.value.members.filter(member => member.roleIds.includes(role.id)).length ?? 0,
    isEveryone: false,
    permissions: BigInt(role.permissions),
  }))
  roles.push({
    id: 'everyone',
    memberCounts: project.value.members.length ?? 0,
    name: 'Tout le monde',
    permissions: BigInt(project.value.everyonePerms),
    position: 1000,
    isEveryone: true,
  })
  roleList.value = roles
}

const cancel = () => selectedId.value = undefined

watch(project, reload, { immediate: true })
</script>

<template>
  <DsoSelectedProject
    :project-id="projectId"
  />
  <template
    v-if="ProjectAuthorized.ManageRoles({ projectPermissions: project.myPerms })"
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
        :all-members="project.members"
        @delete="deleteRole(selectedRole.id)"
        @update-member-roles="(checked: boolean, userId: Member['userId']) => updateMember(checked, userId)"
        @save="(role: Omit<RoleBigint, 'position'>) => saveRole(role)"
        @cancel="cancel"
      />
    </div>
  </template>
  <p
    v-else
  >
    Vous n'avez pas les permissions pour afficher ces ressources
  </p>
</template>
