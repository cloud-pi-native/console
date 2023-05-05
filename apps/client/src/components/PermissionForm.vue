<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import SuggestionInput from './SuggestionInput.vue'
import RangeInput from './RangeInput.vue'
import { levels } from 'shared/src/utils/iterables.js'
import { useProjectStore } from '@/stores/project.js'
import { useProjectPermissionStore } from '@/stores/project-permission.js'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps({
  environment: {
    type: Object,
    default: () => {},
  },
})

const projectStore = useProjectStore()
const projectPermissionStore = useProjectPermissionStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()
const environment = ref(props.environment)
const permissions = ref([])

const project = computed(() => projectStore.selectedProject)
const owner = computed(() => projectStore.selectedProjectOwner)
const projectMembers = computed(() => project.value.users)
const permittedUsersId = computed(() => permissions.value.map(permission => permission.userId))
const isPermitted = computed(() => permittedUsersId.value.includes(userStore.userProfile.id))
const usersToLicence = computed(() =>
  projectMembers.value.filter(projectMember =>
    !permittedUsersId.value.includes(projectMember.id),
  ),
)
const suggestions = computed(() => usersToLicence.value.map(user => user.email))

const setPermissions = () => {
  permissions.value = environment.value.permissions.sort((a, b) => a.level <= b.level)
}

const addPermission = async (userEmail) => {
  const userId = usersToLicence.value.find(user => user.email === userEmail).id
  try {
    await projectPermissionStore.addPermission(environment.value.id, { userId, level: 0 })
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

const updatePermission = async (userId, level) => {
  try {
    await projectPermissionStore.updatePermission(environment.value.id, { userId, level })
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

const deletePermission = async (userId) => {
  try {
    await projectPermissionStore.deletePermission(environment.value.id, userId)
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

watch(project, () => {
  environment.value = project.value.environments.find(env =>
    env.name === environment.value.name,
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
    :legend="`Droits des utilisateurs sur l'environnement de ${environment?.name}`"
    hint="Gérez les droits de lecture, écriture et suppression d'un membre du projet sur l'environnement sélectionné."
  >
    <ul class="flex flex-col gap-2 items-center">
      <li
        v-for="permission in permissions"
        :key="permission.id"
        :data-testid="`userPermissionLi-${permission.user?.email}`"
        class="flex justify-between md:flex-row flex-col w-full"
      >
        <div>
          <DsfrButton
            class="ml-8"
            secondary
            data-testid="deletePermissionBtn"
            :disabled="permission.userId === owner.id || !isPermitted"
            :title="permission.userId === owner.id ? 'Les droits du owner ne peuvent être retirés' : `Retirer les droits de ${permission.user.email}`"
            :icon-only="true"
            icon="ri-close-line"
            @click="deletePermission(permission.userId)"
          />
          <span
            class="p-4 mr-4"
            data-testid="userEmail"
          >
            {{ permission.user.email }}
          </span>
        </div>
        <RangeInput
          data-testid="permissionLevelRange"
          label="Niveau de droits"
          :level="permission.level"
          :levels="levels"
          required="required"
          :disabled="permission.userId === owner.id || !isPermitted"
          @update-level="updatePermission(permission.userId, $event)"
        />
      </li>
    </ul>
  </DsfrFieldset>
  <DsfrFieldset
    v-if="usersToLicence.length"
    data-testid="newPermissionFieldset"
    legend="Accréditer un membre du projet"
  >
    <SuggestionInput
      data-testid="permissionSuggestionInput"
      :disabled="!isPermitted"
      :label="`E-mail de l'utilisateur à accréditer sur l'environnement de ${environment?.name}`"
      placeholder="prenom.nom@interieur.gouv.fr"
      :suggestions="suggestions"
      @update-value="addPermission($event)"
    />
  </DsfrFieldset>
</template>
