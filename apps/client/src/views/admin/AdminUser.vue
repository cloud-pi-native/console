<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import { bts, statusDict } from '@cpn-console/shared'
import type { AdminRole, ProjectV2, Role, User } from '@cpn-console/shared'
import { DsfrTable } from '@gouvminint/vue-dsfr'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useUsersStore } from '@/stores/users.js'
import { useAdminRoleStore } from '@/stores/admin-role.js'
import { useProjectStore } from '@/stores/project.js'
import router from '@/router/index.js'
import { useOrganizationStore } from '@/stores/organization.js'

const props = defineProps<{
  userId: User['id']
}>()

const usersStore = useUsersStore()
const snackbarStore = useSnackbarStore()
const adminRoleStore = useAdminRoleStore()
const projectStore = useProjectStore()
const organizationStore = useOrganizationStore()

const user = ref<User>()

const adminRoles = ref<AdminRole[]>([])
const roleNames = computed<AdminRole[]>(() => adminRoleStore.roles.filter(({ id }) => user.value?.adminRoleIds.includes(id)) ?? [])
const projectsImplied = ref<ProjectV2[]>([])
onBeforeMount(async () => {
  try {
    if (!adminRoleStore.roles.length) {
      adminRoles.value = await adminRoleStore.listRoles()
    }
    if (!organizationStore.organizations.length) {
      await organizationStore.listOrganizations()
    }
    user.value = await usersStore.getUser(props.userId)
    projectsImplied.value = await projectStore.listProjects({ withUser: user.value.id })
  } catch (error) {
    if (error)
      snackbarStore.setMessage('Utilisateur introuvable, redirection...', 'error')
  }
})
const getRolesNames = (roles: Role[], ids: string[]) => ids ? roles.filter(role => ids.includes(role.id)).map(role => role.name) : ''
</script>

<template>
  <div class="flex flex-col gap-10">
    <UserCt
      v-if="user"
      :user="user"
      mode="full"
      size="lg"
      :modal="false"
      :selectable="false"
      class="w-full"
    >
      <template #extra>
        <div class="gap-5 ml-10">
          <span>Rôles:</span>
          <DsfrTag
            v-for="role in roleNames.map(({ name }) => name)"
            :key="role"
            class="shadow shrink ml-2"
            :label="role"
          />
        </div>
      </template>
    </UserCt>
    <DsfrTable
      title="Projets affiliés"
    >
      <template #header>
        <tr>
          <td>Organization</td>
          <td>Nom</td>
          <td>Status</td>
          <td>Rôles</td>
        </tr>
      </template>
      <tr
        v-if="!projectsImplied.length"
      >
        <td
          colspan="4"
        >
          Aucun
        </td>
      </tr>
      <tr
        v-for="project in projectsImplied"
        :key="project.id"
        @click="router.push({ name: 'AdminProject', params: { id: project.id } })"
      >
        <td>
          {{ organizationStore.organizationsById[project.organizationId].label }}
        </td>
        <td>
          {{ project.name }}
        </td>
        <td
          :title="`${statusDict.status[project.status].wording}\n${statusDict.locked[bts(project.locked)].wording}`"
        >
          <div
            class="grid md:grid-cols-2 gap-2"
          >
            <v-icon
              :name="statusDict.status[project.status].icon"
              :fill="statusDict.status[project.status].color"
            />
            <v-icon
              :name="statusDict.locked[bts(project.locked)].icon"
              :fill="statusDict.locked[bts(project.locked)].color"
            />
          </div>
        </td>
        <td
          v-if="project.ownerId === userId"
        >
          Propiétaire
        </td>
        <td v-else>
          <DsfrTag
            v-for="role in getRolesNames(project.roles, project.members.find((member) => member.userId === userId)?.roleIds ?? [])"
            :key="role"
            class="shadow shrink"
            :label="role"
          />
        </td>
      </tr>
    </DsfrTable>
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
