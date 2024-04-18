<script lang="ts" setup>
import { ref, onMounted, watch, computed } from 'vue'
import { levels, projectIsLockedInfo, type Permission, type Environment } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import { useProjectPermissionStore } from '@/stores/project-permission.js'
import { useUserStore } from '@/stores/user.js'
import { getRandomId } from '@gouvminint/vue-dsfr'
import { useUsersStore } from '@/stores/users.js'

const props = withDefaults(defineProps<{
  environment: Partial<Environment>,
}>(), {
  environment: () => ({}),
})

const projectStore = useProjectStore()
const projectPermissionStore = useProjectPermissionStore()
const userStore = useUserStore()
const usersStore = useUsersStore()
const environment = ref<Environment | Record<string, any>>(props.environment)
const permissions = ref<Permission[]>([])
const permissionToUpdate = ref({})
const userToLicence = ref<string>('')
const permissionSuggestionKey = ref(getRandomId('input'))

const project = computed(() => projectStore.selectedProject)
const ownersIds = computed(() => project.value?.roles?.filter(({ role }) => role === 'owner').map(({ userId }) => userId))
const projectMembers = computed(() => project.value?.roles?.map(role => usersStore.users[role.userId]))
// @ts-ignore
const permittedUsersId = computed(() => permissions.value.map(permission => permission.userId))
const isPermitted = computed(() => permittedUsersId.value.includes(userStore.userProfile.id))
const usersToLicence = computed(() => {
  return projectMembers.value?.filter(projectMember =>
    !permittedUsersId.value.includes(projectMember?.id))
})
const suggestions = computed(() => usersToLicence.value?.map(user => user.email))

const setPermissions = () => {
  permissions.value = environment.value?.permissions?.toSorted((a: Permission, b: Permission) => a?.userId >= b?.userId ? 1 : -1)
}

const addPermission = async (userEmail: string) => {
  if (!project.value?.locked) {
    const userId = usersToLicence.value?.find(user => user.email === userEmail)?.id
    // @ts-ignore
    await projectPermissionStore.addPermission(environment.value.id, { userId, level: 0 })
  }
  userToLicence.value = ''
  permissionSuggestionKey.value = getRandomId('input')
}

const updatePermission = async () => {
  if (!project.value?.locked) {
    // @ts-ignore
    await projectPermissionStore.updatePermission(environment.value.id, permissionToUpdate.value)
    permissionToUpdate.value = {}
  }
}

const deletePermission = async (userId: string) => {
  await projectPermissionStore.deletePermission(environment.value?.id, userId)
}

const getDynamicTitle = (locked: boolean, permission: Permission) => {
  if (locked) return projectIsLockedInfo
  if (ownersIds.value?.includes(permission.userId)) return 'Les droits d\'un owner ne peuvent être modifiés'
  // @ts-ignore
  return `Modifier les droits de ${usersStore.users[permission.userId]?.email}`
}

watch(project, () => {
  environment.value = project.value?.environments?.find(env =>
    env.id === environment.value?.id,
  )
  setPermissions()
})

onMounted(() => {
  setPermissions()
})
</script>

<template>
  <DsfrFieldset
    data-testid="permissionsFieldset"
    :legend="`Droits des utilisateurs sur l'environnement ${environment?.name}`"
    hint="Gérez les droits de lecture (r), écriture (w) et suppression (d) d'un membre du projet sur l'environnement sélectionné."
  >
    <DsfrAlert
      v-if="!isPermitted"
      data-testid="notPermittedAlert"
      :description="`Vous n'avez aucun droit sur l'environnement ${environment?.name}. Un membre possédant des droits sur cet environnement peut vous accréditer.`"
      small
      type="info"
    />
    <ul class="flex flex-col gap-4 items-center w-full p-0">
      <li
        v-for="permission in permissions"
        :key="permission.id"
        :data-testid="`userPermissionLi-${usersStore.users[permission.userId]?.email}`"
        class="flex justify-between content-center lg:items-end gap-4 lg:flex-row flex-col w-full"
      >
        <div>
          <div
            class="flex gap-2"
          >
            <v-icon
              :name="ownersIds?.includes(permission.userId) ? 'ri-user-star-fill' : 'ri-user-fill'"
              fill="var(--text-title-blue-france)"
            />
            <p
              class="fr-text-title--blue-france"
              data-testid="userEmail"
            >
              {{ usersStore.users[permission.userId]?.email }}
            </p>
          </div>
          <DsfrButton
            data-testid="deletePermissionBtn"
            :disabled="ownersIds?.includes(permission.userId)|| !isPermitted"
            :title="ownersIds?.includes(permission.userId) ? `Les droits du owner ne peuvent être supprimés`: `Supprimer les droits de ${usersStore.users[permission.userId].email}`"
            label="Supprimer la permission"
            class="my-4"
            secondary
            icon="ri-close-line"
            @click="deletePermission(permission.userId)"
          />
        </div>
        <div>
          <RangeInput
            data-testid="permissionLevelRange"
            label="Niveau de droits"
            :level="permission.level"
            :levels="levels"
            required
            :disabled="ownersIds?.includes(permission.userId) || !isPermitted || project?.locked"
            @update-level="(event) => {
              permissionToUpdate.userId = permission.userId
              permissionToUpdate.level = event
            }"
          />
          <DsfrButton
            :data-testid="`${permission.userId}UpdatePermissionBtn`"
            :disabled="ownersIds?.includes(permission.userId) || !isPermitted || permissionToUpdate.userId !== permission.userId || project?.locked"
            :title="getDynamicTitle(project?.locked, permission)"
            label="Confirmer la modification"
            class="my-4"
            secondary
            icon="ri-check-fill"
            @click="updatePermission()"
          />
        </div>
      </li>
    </ul>
  </DsfrFieldset>
  <DsfrFieldset
    data-testid="newPermissionFieldset"
    legend="Accréditer un membre du projet"
    :hint="usersToLicence?.length ? `Entrez l'e-mail d'un membre du projet ${project?.name}. Ex : ${usersToLicence[0]?.email}` : `Tous les membres du projet ${project?.name} sont déjà accrédités.`"
  >
    <SuggestionInput
      :key="permissionSuggestionKey"
      v-model="userToLicence"
      data-testid="permissionSuggestionInput"
      :disabled="!isPermitted || !usersToLicence?.length || project?.locked"
      :label="`E-mail de l'utilisateur à accréditer sur l'environnement ${environment?.name}`"
      label-visible
      placeholder="prenom.nom@interieur.gouv.fr"
      :suggestions="suggestions"
      @select-suggestion="addPermission($event)"
    />
  </DsfrFieldset>
</template>
