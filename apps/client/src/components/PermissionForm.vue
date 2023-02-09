<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import SuggestionInput from './SuggestionInput.vue'
import RangeInput from './RangeInput.vue'
import { levels } from 'shared/src/utils/iterables.js'

const props = defineProps({
  environment: {
    type: Object,
    default: () => {},
  },
  projectMembers: {
    type: Array,
    default: () => [],
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
})

const environment = ref(props.environment)
const permissions = ref([])

const permittedUsersId = computed(() => permissions.value.map(permission => permission.userId))
const usersToLicence = computed(() =>
  props.projectMembers.filter(projectMember =>
    !permittedUsersId.value.includes(projectMember.id),
  ),
)

const datalist = computed(() => usersToLicence.value.map(user => user.email))

const emit = defineEmits([
  'addPermission',
  'updatePermission',
  'deletePermission',
])

const setPermissions = () => {
  permissions.value = props.environment?.permissions
}

const addPermission = (userEmail) => {
  const userId = usersToLicence.value.find(user => user.email === userEmail).id
  emit('addPermission', { userId, level: 1 })
}

const updatePermission = (userId, level) => {
  emit('updatePermission', { userId, level })
}

const deletePermission = (userId) => {
  emit('deletePermission', userId)
}

watch(environment, (newValue) => {
  environment.value = newValue
})

onMounted(() => {
  setPermissions()
})
</script>

<template>
  <DsfrFieldset
    data-testid="permissionsFieldset"
    :legend="`Droits des utilisateurs sur l'environnement de ${props.environment?.name}`"
    hint="Gérez les droits de lecture, écriture et suppression d'un membre du projet sur l'environnement sélectionné."
  >
    <ul>
      <li
        v-for="permission in permissions"
        :key="permission.id"
        class="flex items-center"
      >
        <DsfrButton
          class="ml-8"
          secondary
          data-testid="deletePermissionBtn"
          :disabled="permission.userId === props.isOwner"
          :title="`Supprimer les droits de ${permission.user.email}`"
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
        <RangeInput
          label="Niveau de droits"
          :level="permission.level"
          :levels="levels"
          required="required"
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
      list-id="permissionList"
      data-testid="permissionInput"
      :label="`E-mail de l'utilisateur à accréditer sur l'environnement de ${props.environment?.name}`"
      label-visible
      placeholder="prenom.nom@interieur.gouv.fr"
      type="text"
      :datalist="datalist"
      @update-value="addPermission($event)"
    />
  </DsfrFieldset>
</template>
