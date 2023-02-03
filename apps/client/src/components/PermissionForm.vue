<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import SuggestionInput from './SuggestionInput.vue'
import RangeInput from './RangeInput.vue'

const props = defineProps({
  environment: {
    type: Object,
    default: () => {},
  },
  projectMembers: {
    type: Array,
    default: () => [],
  },
  isEditable: {
    type: Boolean,
    default: true,
  },
})

const levels = [
  'lecture seule',
  'lecture, écriture',
  'lecture, écriture, suppression',
]

const environment = ref(props.environment)
const permissions = ref([])
// TODO : pq ça fait un tableau dans un tableau ?
const usersToLicence = computed(() =>
  permissions.value.map(permission =>
    props.projectMembers.filter(projectMember =>
      projectMember.id !== permission.user.id,
    ),
  ),
)
const datalist = computed(() => usersToLicence.value[0].map(user => user.email))

const emit = defineEmits([
  'addPermission',
  'updatePermission',
  'deletePermission',
])

const setPermissions = () => {
  permissions.value = props.environment?.permissions
}

const addPermission = (userEmail) => {
  const userId = usersToLicence.value[0].find(user => user.email === userEmail).id
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
    :legend="`Droits des utilisateurs sur l\'environnement de ${props.environment?.name}`"
    hint="Gérez les droits de lecture, écrire et suppression d'un membre du projet sur l'environnement sélectionné."
  >
    <ul>
      <li
        v-for="permission in permissions"
        :key="permission.id"
        class="flex items-center"
      >
        <span
          class="p-4 mr-4"
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
        <DsfrButton
          class="ml-8"
          secondary
          :title="`Supprimer les droits de ${permission.user.email}`"
          :icon-only="true"
          icon="ri-close-line"
          @click="deletePermission(permission.userId)"
        />
      </li>
    </ul>
  </DsfrFieldset>
  <DsfrFieldset
    v-if="usersToLicence.length"
    legend="Accréditer un membre du projet"
  >
    <SuggestionInput
      list-id="permissionList"
      data-testid="permissionInput"
      label="E-mail de l'utilisateur à accréditer"
      label-visible
      placeholder="prenom.nom@interieur.gouv.fr"
      type="text"
      :datalist="datalist"
      @update-value="addPermission($event)"
    />
  </DsfrFieldset>
</template>
