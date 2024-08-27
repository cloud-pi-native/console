<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import type {
  LettersQuery,
  Member,
  ProjectV2,
  User,
} from '@cpn-console/shared'
import pDebounce from 'p-debounce'
import { useProjectMemberStore } from '@/stores/project-member.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { copyContent } from '@/utils/func.js'

const props = withDefaults(
  defineProps<{
    project: ProjectV2
    canManage: boolean
    canTransfer: boolean
  }>(),
  {
    canManage: false,
    canTransfer: true,
  },
)

const emit = defineEmits<{
  addMember: [value: string]
  updateRole: [value: string]
  cancel: []
  removeMember: [value: string]
  transferOwnership: [value: string]
}>()

const projectMemberStore = useProjectMemberStore()
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
const newUserInputKey = ref(getRandomId('input'))
const newUserEmail = ref<string>('')
const usersToAdd = ref<User[]>([])
const rows = ref<any[][]>([])
const lettersNotMatching = ref('')
const tableKey = ref(getRandomId('table'))

const isUserAlreadyInTeam = computed(() => {
  return !!(newUserEmail.value && (props.project.owner.email === newUserEmail.value || props.project.members.find(member => member.email === newUserEmail.value)))
})

function removeUserHint(member: Member) {
  if (props.canManage) {
    return `retirer ${member.email} du projet`
  }
  return 'vous n\'avez pas les droits suffisants pour retirer un membre du projet'
}

const usersToSuggest = computed(() => usersToAdd.value.map(userToAdd => ({
  value: userToAdd.email,
  furtherInfo: `${userToAdd.firstName} ${userToAdd.lastName}`,
})))

const getRolesNames = (ids?: string[]) => ids ? props.project.roles.filter(role => ids.includes(role.id)).map(role => role.name).join(' / ') || '-' : ''
function getCopyIdComponent(id: string) {
  return {
    component: 'code',
    text: id,
    title: 'Copier l\'id',
    'data-testid': 'ownerId',
    class: 'fr-text-default--info text-xs truncate cursor-pointer',
    onClick: () => copyContent(id),
  }
}

function createMemberRow(member: Member) {
  return props.canManage
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
          : {
              cellAttrs: {
                class: 'fr-fi-close-line !flex justify-center cursor-not-allowed',
                title: removeUserHint(member),
              },
            },
      ]
    : [
        getCopyIdComponent(member.userId),
        member.email,
        props.project.ownerId === member.userId ? 'Propriétaire' : getRolesNames(member.roleIds),
      ]
}

function setRows() {
  rows.value = []
  if (!props.project.members.find(member => member.userId === props.project.ownerId)) {
    rows.value.push(createMemberRow({ ...props.project.owner, roleIds: [], userId: props.project.owner.id }))
  }
  if (props.project.members?.length) {
    props.project.members.forEach((member) => {
      rows.value.push(createMemberRow(member))
    })
  }
  tableKey.value = getRandomId('table')
}

const retrieveUsersToAdd = pDebounce(async (letters: LettersQuery['letters']) => {
  // Ne pas lancer de requête à moins de 3 caractères tapés
  if (letters.length < 3)
    return
  // Ne pas relancer de requête à chaque lettre ajoutée si aucun user ne correspond aux premières lettres données
  if (lettersNotMatching.value && letters.includes(lettersNotMatching.value) && !usersToAdd.value?.length)
    return
  usersToAdd.value = await projectMemberStore.getMatchingUsers(props.project.id, letters)
  // Stockage des lettres qui ne renvoient aucun résultat
  if (!usersToAdd.value?.length) {
    lettersNotMatching.value = letters
  }
}, 300)

async function addUserToProject() {
  if (!newUserEmail.value)
    return
  if (isUserAlreadyInTeam.value)
    return snackbarStore.setMessage('L\'utilisateur semble déjà faire partie du projet')

  emit('addMember', newUserEmail.value.trim())

  newUserEmail.value = ''
  usersToAdd.value = []
  newUserInputKey.value = getRandomId('input')
}

async function removeUserFromProject(userId: string) {
  emit('removeMember', userId)
}

onMounted(() => {
  setRows()
})

watch(() => props.project.members, setRows)

const isTransferingProject = ref(false)
const nextOwnerId = ref<string | undefined>(undefined)

function transferOwnership() {
  if (nextOwnerId.value && props.project.members.find(member => member.userId === nextOwnerId.value)) {
    emit('transferOwnership', nextOwnerId.value)
  }
}
const transferSelectOptions = props.project.members.map(member => ({
  text: `${member.lastName} ${member.firstName} (${member.email})`,
  value: member.userId,
}))
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
        title="Membres du projet"
        data-testid="teamTable"
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
          :suggestions="usersToSuggest"
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
          data-testid="showTransferProjectBtn"
          label="Transférer le projet"
          primary
          icon="ri-exchange-line"
          @click="isTransferingProject = true"
        />
        <div
          v-if="isTransferingProject"
        >
          <DsfrAlert
            v-if="!transferSelectOptions.length"
            description="Pour pouvoir transférer la propriété du projet, vous devez ajouter au moins un membre à l'équipe."
            small
            type="warning"
            class="fr-mb-4w w-40em"
          />
          <div
            v-else
          >
            <DsfrAlert
              description="Attention, en transférant la propriété du projet vous perdrez vos droits sur le projet  et deviendrez un membre de l'équipe."
              small
              type="warning"
              class="fr-mb-4w w-40em"
            />
            <DsfrSelect
              v-model="nextOwnerId"
              label="Choisir le futur propriétaire du projet"
              select-id="nextOwnerSelect"
              default-unselected-text="Veuillez choisir un utilisateur"
              :options="transferSelectOptions"
            />
            <div
              class="flex justify-between"
            >
              <DsfrButton
                data-testid="transferProjectBtn"
                label="Transférer le projet"
                :disabled="!nextOwnerId"
                secondary
                icon="ri-exchange-line"
                @click="transferOwnership()"
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
    </div>
    <LoadingCt
      v-if="snackbarStore.isWaitingForResponse"
      description="Mise à jour de l'équipe projet"
    />
  </div>
</template>
