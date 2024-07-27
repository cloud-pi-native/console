<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { DsfrButton, getRandomId } from '@gouvminint/vue-dsfr'
import {
  adminGroupPath,
  UserSchema,
  type LettersQuery,
  type UserProfile,
  type User,
  type Project,
  parseZodError,
  type ProjectRoles,
} from '@cpn-console/shared'
import pDebounce from 'p-debounce'
import { useProjectUserStore } from '@/stores/project-user'
import { copyContent } from '@/utils/func.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const projectUserStore = useProjectUserStore()

const headers = [
  'Identifiant keycloak',
  'E-mail',
  'Rôle',
  'Retirer du projet',
]

const props = withDefaults(
  defineProps<{
    userProfile?: UserProfile
    project: Pick<Project, 'id' | 'locked' | 'name'>
    members: Array<{ userId: User['id'], role: ProjectRoles }>
    knownUsers: Record<string, User>
  }>(),
  {
    userProfile: undefined,
  },
)

const snackbarStore = useSnackbarStore()

const isUserAlreadyInTeam = computed(() => {
  return !!props.members.find(member => props.knownUsers[member.userId]?.email === newUserEmail.value)
})

const removeUserHint = (userId: User['id']) => {
  if (isOwnerOrAdmin.value) return `retirer ${props.knownUsers[userId].email} du projet`
  else if (userId === props.userProfile?.id) return 'me retirer du projet'
  else return 'vous n\'avez pas les droits suffisants pour retirer un membre du projet'
}

const isOwnerOrAdmin = ref(props.members.some(member => (member.userId === props.userProfile?.id && member.role === 'owner')
  || props.userProfile?.groups?.includes(adminGroupPath)))
const newUserInputKey = ref(getRandomId('input'))
const newUserEmail = ref('')
const usersToAdd = ref<string[] | undefined>([])
const rows = ref<any[][]>([])
const lettersNotMatching = ref('')
const tableKey = ref(getRandomId('table'))
const isTransferingRole = ref('')

const setRows = () => {
  rows.value = []

  if (props.members?.length) {
    props.members.forEach((member) => {
      if (member.role === 'owner') {
        rows.value.unshift([
          {
            component: 'code',
            text: member.userId,
            title: 'Copier l\'id',
            'data-testid': 'ownerId',
            class: 'fr-text-default--info text-xs truncate cursor-pointer',
            onClick: () => copyContent(member.userId),
          },
          props.knownUsers[member.userId].email,
          {
            component: 'DsfrTag',
            label: member.role,
            'data-testid': 'ownerTag',
            class: 'fr-background-contrast--blue-france',
          },
          {
            cellAttrs: {
              class: 'fr-fi-close-line !flex justify-center disabled',
              title: `${props.knownUsers[member.userId].email} ne peut pas être retiré(e) du projet`,
            },
          },
        ])
        return
      }
      rows.value.push([
        {
          component: 'code',
          text: member.userId,
          title: 'Copier l\'id',
          'data-testid': 'userId',
          class: 'fr-text-default--info text-xs truncate cursor-pointer',
          onClick: () => copyContent(member.userId),
        },
        props.knownUsers[member.userId].email,
        {
          component: 'DsfrSelect',
          modelValue: member.role,
          selectId: `roleSelect-${member.userId}`,
          disabled: !isOwnerOrAdmin.value,
          options: ['owner', 'user'],
          'onUpdate:model-value': () => confirmUpdateUserRole(member.userId),
        },
        {
          cellAttrs: {
            class: `fr-fi-close-line !flex justify-center ${isOwnerOrAdmin.value || member.userId === props.userProfile?.id ? 'cursor-pointer fr-text-default--warning' : 'disabled'}`,
            title: removeUserHint(member.userId),
            onClick: () => removeUserFromProject(member.userId),
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
  if (lettersNotMatching.value && letters.includes(lettersNotMatching.value) && !usersToAdd.value?.length) return
  usersToAdd.value = (await projectUserStore.getMatchingUsers(props.project.id, letters))?.map(userToAdd => userToAdd.email)
  // Stockage des lettres qui ne renvoient aucun résultat
  if (!usersToAdd.value?.length) {
    lettersNotMatching.value = letters
  }
}, 300)

const emit = defineEmits<{
  addMember: [value: string]
  updateRole: [value: string]
  cancel: []
  removeMember: [value: string]
}>()

const addUserToProject = async (email: string) => {
  const validationSchema = UserSchema.pick({ email: true }).safeParse({ email })
  if (!validationSchema.success) return snackbarStore.setMessage(parseZodError(validationSchema.error))
  if (isUserAlreadyInTeam.value) return snackbarStore.setMessage('L\'utilisateur semble déjà faire partie du projet')

  emit('addMember', email)

  newUserEmail.value = ''
  usersToAdd.value = []
  newUserInputKey.value = getRandomId('input')
}

const confirmUpdateUserRole = (userId: string) => {
  isTransferingRole.value = userId
}

const cancelUpdateUserRole = () => {
  isTransferingRole.value = ''
  setRows()
}

const updateUserRole = async (userId: string) => {
  isTransferingRole.value = ''
  emit('updateRole', userId)
}

const removeUserFromProject = async (userId: string) => {
  emit('removeMember', userId)
}

onMounted(() => {
  setRows()
})
watch(() => props.members, setRows)
</script>

<template>
  <div
    class="relative"
  >
    <div
      v-if="isTransferingRole"
      class="danger-zone"
      data-testid="confirmTransferingRoleZone"
    >
      <p
        data-testid="updatedDataSummary"
      >
        Êtes-vous certain de vouloir modifier le souscripteur du projet ?
      </p>
      <div
        class="mt-8 flex gap-4"
      >
        <DsfrButton
          label="Confirmer"
          data-testid="confirmUpdateBtn"
          primary
          @click="updateUserRole(isTransferingRole)"
        />
        <DsfrButton
          label="Annuler"
          data-testid="cancelUpdateBtn"
          secondary
          @click="cancelUpdateUserRole()"
        />
      </div>
    </div>
    <div
      v-show="!isTransferingRole"
      class="w-max"
    >
      <DsfrTable
        id="team-table"
        :key="tableKey"
        data-testid="teamTable"
        :title="`Membres du projet`"
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
        @select-suggestion="(value: string) => newUserEmail = value"
        @update:model-value="(value: string) => retrieveUsersToAdd(value)"
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
      v-if="snackbarStore.isWaitingForResponse"
      description="Mise à jour de l'équipe projet"
    />
  </div>
</template>
<style>
#team-table tbody > tr > td:nth-child(3),
#team-table tbody > tr > td:nth-child(1) {
  width: 15%;
}

</style>
