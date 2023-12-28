<script lang="ts" setup>
import { ref, computed, onMounted, watch, type Ref } from 'vue'
import { DsfrButton, getRandomId } from '@gouvminint/vue-dsfr'
import {
  adminGroupPath,
  schemaValidator,
  userSchema,
  type LettersQuery,
  type UserProfile,
  type UserModel,
  type RoleModel,
  type ProjectModel,
} from '@dso-console/shared'
import SuggestionInput from '@/components/SuggestionInput.vue'
import LoadingCt from '@/components/LoadingCt.vue'
import pDebounce from 'p-debounce'
import { useProjectUserStore } from '@/stores/project-user'
import { copyContent } from '@/utils/func.js'

const projectUserStore = useProjectUserStore()

const headers = [
  'Identifiant keycloak',
  'E-mail',
  'Rôle',
  'Retirer du projet',
]

const props = withDefaults(
  defineProps<{
    userProfile: UserProfile
    project: Pick<ProjectModel, 'id' | 'locked' | 'name'>
    roles: Array<RoleModel>
    isUpdatingProjectMembers?: boolean
    knownUsers: Record<string, Required<UserModel>>
  }>(),
  {},
)

const isUserAlreadyInTeam = computed(() => {
  return !!props.roles?.find(role => props.knownUsers[role.userId]?.email === newUserEmail.value)
})

const isOwnerOrAdmin = ref(props.roles.some(role => (role.userId === props.userProfile.id && role.role === 'owner') ||
  props.userProfile.groups?.includes(adminGroupPath)))
const newUserInputKey = ref(getRandomId('input'))
const newUserEmail = ref('')
const usersToAdd: Ref<string[]> = ref([])
const rows = ref<any[][]>([])
const lettersNotMatching = ref('')
const tableKey = ref(getRandomId('table'))

const setRows = () => {
  rows.value = []

  if (props.roles?.length) {
    props.roles.forEach(role => {
      if (role.role === 'owner') {
        rows.value.unshift([
          {
            component: 'code',
            text: role.userId,
            title: 'Copier l\'id',
            class: 'fr-text-default--info text-xs cursor-pointer',
            onClick: () => copyContent(role.userId),
          },
          props.knownUsers[role.userId].email,
          {
            component: 'DsfrSelect',
            modelValue: role.role,
            selectId: 'role-select',
            options: ['owner', 'user'],
            disabled: true,
            'onUpdate:model-value': ($event: string) => updateUserRole(role.userId, $event),
          },
          {
            cellAttrs: {
              class: 'fr-fi-close-line !flex justify-center disabled',
              title: `${props.knownUsers[role.userId].email} ne peut pas être retiré(e) du projet`,
            },
          },
        ])
        return
      }
      rows.value.push([
        {
          component: 'code',
          text: role.userId,
          title: 'Copier l\'id',
          class: 'fr-text-default--info text-xs cursor-pointer',
          onClick: () => copyContent(role.userId),
        },
        props.knownUsers[role.userId].email,
        {
          component: 'DsfrSelect',
          modelValue: role.role,
          selectId: 'role-select',
          options: ['owner', 'user'],
          disabled: true,
          'onUpdate:model-value': ($event: string) => updateUserRole(role.userId, $event),
        },
        {
          cellAttrs: {
            class: `fr-fi-close-line !flex justify-center ${isOwnerOrAdmin.value ? 'cursor-pointer fr-text-default--warning' : 'disabled'}`,
            title: isOwnerOrAdmin.value ? `retirer ${props.knownUsers[role.userId].email} du projet` : 'vous n\'avez pas les droits suffisants pour retirer un membre du projet',
            onClick: () => removeUserFromProject(role.userId),
          },
        },
      ])
    })
  }
  tableKey.value = getRandomId('table')
}

const retrieveUsersToAdd = pDebounce(async (letters: LettersQuery['letters']) => {
  // Ne pas lancer de requête à moins de 3 caractères tapés
  if (letters.length < 3) return
  // Ne pas relancer de requête à chaque lettre ajoutée si aucun user ne correspond aux premières lettres données
  if (lettersNotMatching.value && letters.includes(lettersNotMatching.value) && !usersToAdd.value.length) return
  usersToAdd.value = (await projectUserStore.getMatchingUsers(props.project.id, letters)).map(userToAdd => userToAdd.email)
  // Stockage des lettres qui ne renvoient aucun résultat
  if (!usersToAdd.value.length) {
    lettersNotMatching.value = letters
  }
}, 300)

const emit = defineEmits<{
  addMember: [value: string]
  updateRole: [value: { userId: string, role: string}]
  cancel: []
  removeMember: [value: string]
}>()

const addUserToProject = async (email: string) => {
  const keysToValidate = ['email']
  const errorSchema = schemaValidator(userSchema, { email }, { keysToValidate })
  if (Object.keys(errorSchema).length || isUserAlreadyInTeam.value) return
  emit('addMember', email)

  newUserEmail.value = ''
  usersToAdd.value = []
  newUserInputKey.value = getRandomId('input')
}

const updateUserRole = async (userId: string, role: string) => {
  emit('updateRole', { userId, role })
}

const removeUserFromProject = async (userId: string) => {
  emit('removeMember', userId)
}

onMounted(() => {
  setRows()
})
watch(() => props.roles, setRows)
</script>

<template>
  <div
    class="relative"
  >
    <div
      class="w-max"
    >
      <DsfrTable
        id="team-table"
        :key="tableKey"
        data-testid="teamTable"
        :title="`Membres du projet ${project?.name}`"
        :headers="headers"
        :rows="rows"
      />
      <SuggestionInput
        :key="newUserInputKey"
        v-model="newUserEmail"
        data-testid="addUserSuggestionInput"
        :disabled="project?.locked"
        label="Ajouter un utilisateur via son adresse e-mail"
        label-visible
        hint="Adresse e-mail associée au compte keycloak de l'utilisateur"
        placeholder="prenom.nom@interieur.gouv.fr"
        :suggestions="usersToAdd"
        @select-suggestion="$event => newUserEmail = $event"
        @update:model-value="retrieveUsersToAdd($event)"
      />
      <DsfrAlert
        v-if="isUserAlreadyInTeam"
        data-testid="userErrorInfo"
        description="L'utilisateur associé à cette adresse e-mail fait déjà partie du projet."
        small
        type="error"
        class="w-max fr-mb-2w"
      />
      <DsfrButton
        data-testid="addUserBtn"
        label="Ajouter l'utilisateur"
        secondary
        icon="ri-user-add-line"
        :disabled="project?.locked || !newUserEmail || isUserAlreadyInTeam"
        @click="addUserToProject(newUserEmail)"
      />
    </div>
    <LoadingCt
      v-if="isUpdatingProjectMembers"
      description="Mise à jour de l'équipe projet"
    />
  </div>
</template>
<style>
#team-table tbody > tr > td:nth-child(3) {
  width: 15%;
}

</style>
