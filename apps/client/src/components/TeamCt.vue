<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { DsfrButton, getRandomId } from '@gouvminint/vue-dsfr'
import {
  type LettersQuery,
  type UserProfile,
  type User,
  type ProjectV2,
  type Member,
} from '@cpn-console/shared'
import pDebounce from 'p-debounce'
import { useProjectUserStore } from '@/stores/project-user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { copyContent } from '@/utils/func.js'

const projectUserStore = useProjectUserStore()

const props = withDefaults(
  defineProps<{
    userProfile?: UserProfile
    project: ProjectV2
    members: Member[]
    knownUsers: Record<string, User>
    canManage: boolean
  }>(),
  {
    userProfile: undefined,
    canManage: false,
  },
)

const headers = props.canManage
  ? [
    'Identifiant',
    'E-mail',
    'Rôles',
    'Retirer du projet',
  ]
  : [
    'Identifiant',
    'E-mail',
    'Rôles',
  ]

const snackbarStore = useSnackbarStore()

const isUserAlreadyInTeam = computed(() => {
  return !!(newUserEmail.value && props.members.find(member => member.email === newUserEmail.value))
})

const removeUserHint = (member: Member) => {
  if (props.canManage) {
    return `retirer ${member.email} du projet`
  }
  return 'vous n\'avez pas les droits suffisants pour retirer un membre du projet'
}

const newUserInputKey = ref(getRandomId('input'))
const newUserEmail = ref<string>('')
const usersToAdd = ref<User[]>([])
const rows = ref<any[][]>([])
const lettersNotMatching = ref('')
const tableKey = ref(getRandomId('table'))
const isTransferingRole = ref('')

const getRolesNames = (ids?: string[]) => ids ? props.project.roles.filter(role => ids.includes(role.id)).map(role => role.name).join(' / ') || '-' : ''
const getCopyIdComponent = (id: string) => ({
  component: 'code',
  text: id,
  title: 'Copier l\'id',
  'data-testid': 'ownerId',
  class: 'fr-text-default--info text-xs truncate cursor-pointer',
  onClick: () => copyContent(id),
})

const createMemberRow = (member: Member) => props.canManage
  ? [
    getCopyIdComponent(member.userId),
    member.email,
    props.project.ownerId === member.userId ? 'Propriétaire' : getRolesNames(member.roleIds),
    props.project.ownerId !== member.userId
      ? {
        cellAttrs: {
          class: 'fr-fi-close-line !flex justify-center cursor-pointer fr-text-default--warning',
          title: removeUserHint(member),
          onClick: () => removeUserFromProject(member.userId),
        },
      }
      : '-',
  ]
  : [
    getCopyIdComponent(member.userId),
    member.email,
    props.project.ownerId === member.userId ? 'Propriétaire' : getRolesNames(member.roleIds),
  ]

const setRows = () => {
  rows.value = []
  if (!props.members.find(member => member.userId === props.project.ownerId)) {
    rows.value.push(createMemberRow({ ...props.project.owner, roleIds: [], userId: props.project.owner.id }))
  }
  if (props.members?.length) {
    props.members.forEach((member) => {
      rows.value.push(createMemberRow(member))
    })
  }
  tableKey.value = getRandomId('table')
}

const retrieveUsersToAdd = pDebounce(async (letters: LettersQuery['letters']) => {
  // Ne pas lancer de requête à moins de 3 caractères tapés
  if (letters.length < 3) return
  // Ne pas relancer de requête à chaque lettre ajoutée si aucun user ne correspond aux premières lettres données
  if (lettersNotMatching.value && letters.includes(lettersNotMatching.value) && !usersToAdd.value?.length) return
  usersToAdd.value = await projectUserStore.getMatchingUsers(props.project.id, letters)
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

const addUserToProject = async () => {
  if (!newUserEmail.value) return
  if (isUserAlreadyInTeam.value) return snackbarStore.setMessage('L\'utilisateur semble déjà faire partie du projet')

  emit('addMember', newUserEmail.value)

  newUserEmail.value = ''
  usersToAdd.value = []
  newUserInputKey.value = getRandomId('input')
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
        v-if="props.canManage"
        :key="newUserInputKey"
        v-model="newUserEmail"
        data-testid="addUserSuggestionInput"
        :disabled="project?.locked"
        label="Nom, prénom ou adresse mail de l'utilisateur à rechercher"
        label-visible
        hint="Adresse e-mail de l'utilisateur"
        placeholder="prenom.nom@interieur.gouv.fr"
        :suggestions="usersToAdd"
        @select-suggestion="(value: User) => newUserEmail = value.email"
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
        v-if="props.canManage"
        data-testid="addUserBtn"
        label="Ajouter l'utilisateur"
        secondary
        icon="ri-user-add-line"
        :disabled="project?.locked || !newUserEmail || isUserAlreadyInTeam"
        @click="addUserToProject()"
      />
    </div>
    <LoadingCt
      v-if="snackbarStore.isWaitingForResponse"
      description="Mise à jour de l'équipe projet"
    />
  </div>
</template>
