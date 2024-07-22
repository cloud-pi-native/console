<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import {
  type LettersQuery,
  type UserProfile,
  type User,
  type ProjectV2,
  type Member,
} from '@cpn-console/shared'
import pDebounce from 'p-debounce'
import { useProjectMemberStore } from '@/stores/project-member.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { copyContent } from '@/utils/func.js'

const projectMemberStore = useProjectMemberStore()

const props = withDefaults(
  defineProps<{
    userProfile?: UserProfile
    project: ProjectV2
    members: Member[]
    canManage: boolean
    canTransfer: boolean
  }>(),
  {
    userProfile: undefined,
    canManage: false,
    canTransfer: true,
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
  usersToAdd.value = await projectMemberStore.getMatchingUsers(props.project.id, letters)
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
  transferOwnership: [value: string]
}>()

const addUserToProject = async () => {
  if (!newUserEmail.value) return
  if (isUserAlreadyInTeam.value) return snackbarStore.setMessage('L\'utilisateur semble déjà faire partie du projet')

  emit('addMember', newUserEmail.value)

  newUserEmail.value = ''
  usersToAdd.value = []
  newUserInputKey.value = getRandomId('input')
}

const removeUserFromProject = async (userId: string) => {
  emit('removeMember', userId)
}

onMounted(() => {
  setRows()
})

watch(() => props.members, setRows)

const isTransferingProject = ref(false)
const nextOwnerId = ref('')

const transferOwnership = (ownerId: string) => {
  if (props.members.find(member => member.userId === ownerId)) {
    emit('transferOwnership', ownerId)
  }
}
const transferSelectOptions = [
  {
    text: 'Veuillez choisir un utilisateur',
    value: '',
  },
  ...props.project.members.map(member => ({
    text: `${member.lastName} ${member.firstName} (${member.email})`,
    value: member.userId,
  })),
]
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
        :title="`Membres du projet`"
        :headers="headers"
        :rows="rows"
      />
      <div>
        <SuggestionInput
          v-if="props.canManage"
          :key="newUserInputKey"
          v-model="newUserEmail"
          data-testid="addUserSuggestionInput"
          :disabled="project?.locked"
          label="Ajouter un utilisateur"
          label-visible
          hint="Nom, prénom ou adresse mail de l'utilisateur à rechercher"
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
      <div
        v-if="canTransfer"
        data-testid="transferProjectZone"
        class="danger-zone"
      >
        <DsfrButton
          v-show="!isTransferingProject"
          data-testid="showArchiveProjectBtn"
          :label="`Transférer le projet`"
          primary
          icon="ri-delete-bin-7-line"
          @click="isTransferingProject = true"
        />
        <div
          v-if="isTransferingProject"
        >
          <!-- <DsfrAlert
            class="<md:mt-2 fr-mb-2w"
            description="La suppression du projet entraîne la suppression de toutes les ressources applicatives associées."
            type="info"
            small
          /> -->
          <DsfrSelect
            v-model="nextOwnerId"
            label="Choisir le futur propriétaire du projet"
            :options="transferSelectOptions"
          />
          <div
            class="flex justify-between"
          >
            <DsfrButton
              data-testid="transferProjectBtn"
              :label="`Transférer le projet`"
              :disabled="!nextOwnerId"
              secondary
              icon="ri-delete-bin-7-line"
              @click="transferOwnership(nextOwnerId)"
            />
            <DsfrButton
              label="Annuler"
              primary
              @click="isTransferingProject = false"
            />
          </div>
        </div>
      </div>
    </div>
    <LoadingCt
      v-if="snackbarStore.isWaitingForResponse"
      description="Mise à jour de l'équipe projet"
    />
  </div>
</template>
@/stores/project-member.js
