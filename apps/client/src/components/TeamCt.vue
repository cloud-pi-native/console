<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getRandomId } from '@gouvminint/vue-dsfr'
import type {
  LettersQuery,
  Member,
  User,
} from '@cpn-console/shared'
import pDebounce from 'p-debounce'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { copyContent } from '@/utils/func.js'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'
import type { Project } from '@/utils/project-utils.js'

const props = withDefaults(
  defineProps<{
    project: Project
    canManage: boolean
    canTransfer: boolean
  }>(),
  {
    canManage: false,
    canTransfer: true,
  },
)

const emit = defineEmits<{
  refresh: []
  leave: []
}>()

const projectStore = useProjectStore()
const headers = [
  'Identifiant',
  'E-mail',
  'Rôles',
  'Retirer du projet',
]

const snackbarStore = useSnackbarStore()
const userStore = useUserStore()
const newUserInputKey = ref(getRandomId('input'))
const newUserEmail = ref<string>('')
const usersToAdd = ref<User[]>([])
const rows = ref<any[][]>([])
const lettersNotMatching = ref('')
const tableKey = ref(getRandomId('table'))

const isUserAlreadyInTeam = computed(() => {
  return !!(newUserEmail.value && (props.project.owner.email === newUserEmail.value || props.project.members.find(member => member.email === newUserEmail.value)))
})

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
  const row: Array<any> = [
    getCopyIdComponent(member.userId),
    member.email,
    props.project.ownerId === member.userId ? 'Propriétaire' : getRolesNames(member.roleIds),
  ]
  if (props.project.ownerId === member.userId) {
    row.push('-')
  } else if (member.userId === userStore.userProfile?.id) {
    row.push({
      cellAttrs: {
        class: 'fr-fi-close-line !flex justify-center cursor-pointer fr-text-default--warning',
        title: 'Quitter le projet',
        onClick: () => removeUserFromProject(member.userId),
      },
    })
  } else if (props.canManage) {
    row.push({
      cellAttrs: {
        class: 'fr-fi-close-line !flex justify-center cursor-pointer fr-text-default--warning',
        title: `Retirer ${member.email} du projet`,
        onClick: () => removeUserFromProject(member.userId),
      },
    })
  } else {
    row.push('-')
  }
  return row
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
  if (letters.length < 3) return
  // Ne pas relancer de requête à chaque lettre ajoutée si aucun user ne correspond aux premières lettres données
  if (lettersNotMatching.value && letters.includes(lettersNotMatching.value) && !usersToAdd.value?.length) return
  usersToAdd.value = await projectStore.projectsBySlug[props.project.slug].Members.getCandidateUsers(letters)
  // Stockage des lettres qui ne renvoient aucun résultat
  if (!usersToAdd.value?.length) {
    lettersNotMatching.value = letters
  }
}, 300)

onMounted(() => {
  setRows()
})

watch(() => props.project.members, setRows, { immediate: true })

const isTransferingProject = ref(false)
const nextOwnerId = ref<string | undefined>(undefined)

const transferSelectOptions = props.project.members.map(member => ({
  text: `${member.lastName} ${member.firstName} (${member.email})`,
  value: member.userId,
}))

async function addUserToProject() {
  if (!newUserEmail.value) return
  if (isUserAlreadyInTeam.value) return snackbarStore.setMessage('L\'utilisateur semble déjà faire partie du projet')

  await props.project.Members.create(newUserEmail.value)
    .finally(() => emit('refresh'))

  newUserEmail.value = ''
  usersToAdd.value = []
  newUserInputKey.value = getRandomId('input')
}

async function removeUserFromProject(userId: string) {
  await props.project.Members.delete(userId)
    .finally(() => {
      emit('refresh')
      if (userStore.userProfile?.id === userId) {
        emit('leave')
      }
    })
}

async function transferOwnerShip() {
  if (nextOwnerId.value && props.project.members.find(member => member.userId === nextOwnerId.value)) {
    await props.project.Commands.update({ ownerId: nextOwnerId.value })
      .finally(() => emit('refresh'))
  }
}
</script>

<template>
  <div
    class="flex flex-col w-max"
  >
    <DsfrTable
      id="team-table"
      :key="tableKey"
      title="Membres du projet"
      data-testid="teamTable"
      :headers="headers"
      :rows="rows"
    />

    <div
      class="flex w-full items-end"
    >
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
        class="grow"
        @select-suggestion="(value: string) => newUserEmail = value"
        @update:model-value="(value: string) => retrieveUsersToAdd(value)"
      />
      <DsfrButton
        v-if="props.canManage"
        data-testid="addUserBtn"
        label="Ajouter"
        secondary
        icon="ri:user-add-line"
        :disabled="project?.locked || !newUserEmail || isUserAlreadyInTeam"
        @click="addUserToProject"
      />
    </div>
    <DsfrAlert
      v-if="isUserAlreadyInTeam"
      data-testid="userErrorInfo"
      description="L'utilisateur associé à cette adresse e-mail fait déjà partie du projet."
      small
      type="error"
      class="w-max fr-mb-2w"
    />
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
        icon="ri:exchange-line"
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
            description="Attention, en transférant la propriété du projet vous perdez vos droits sur le projet et devenez un membre de l'équipe."
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
              icon="ri:exchange-line"
              @click="transferOwnerShip"
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
</template>
