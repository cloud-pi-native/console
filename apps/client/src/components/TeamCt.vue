<script lang="ts" setup>
import { computed, ref } from 'vue'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import type { DsfrButtonProps } from '@gouvminint/vue-dsfr'
import { getRandomId } from '@gouvminint/vue-dsfr'
import type {
  LettersQuery,
  Member,
  ProjectV2,
  User,
} from '@cpn-console/shared'
import pDebounce from 'p-debounce'
import UserCt from './UserCt.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'

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
const projectStore = useProjectStore()

const snackbarStore = useSnackbarStore()
const userStore = useUserStore()
const newUserInputKey = ref(getRandomId('input'))
const newUserEmail = ref<string>('')
const usersToAdd = ref<User[]>([])
const lettersNotMatching = ref('')
const tableKey = ref(getRandomId('table'))

const isUserAlreadyInTeam = computed(() => {
  return !!(newUserEmail.value && (props.project.owner.email === newUserEmail.value || props.project.members.find(member => member.email === newUserEmail.value)))
})

const usersToSuggest = computed(() => usersToAdd.value.map(userToAdd => ({
  value: userToAdd.email,
  furtherInfo: `${userToAdd.firstName} ${userToAdd.lastName}`,
})))

const getRolesNames = (ids: string[]) => ids ? props.project.roles.filter(role => ids.includes(role.id)).map(role => role.name) : ''

const retrieveUsersToAdd = pDebounce(async (letters: LettersQuery['letters']) => {
  // Ne pas lancer de requête à moins de 3 caractères tapés
  if (letters.length < 3) return
  // Ne pas relancer de requête à chaque lettre ajoutée si aucun user ne correspond aux premières lettres données
  if (lettersNotMatching.value && letters.includes(lettersNotMatching.value) && !usersToAdd.value?.length) return
  usersToAdd.value = await projectStore.projectsById[props.project.id].Members.getCandidateUsers(letters)
  // Stockage des lettres qui ne renvoient aucun résultat
  if (!usersToAdd.value?.length) {
    lettersNotMatching.value = letters
  }
}, 300)

async function addUserToProject() {
  if (!newUserEmail.value) return
  if (isUserAlreadyInTeam.value) return snackbarStore.setMessage('L\'utilisateur semble déjà faire partie du projet')

  emit('addMember', newUserEmail.value.trim())

  newUserEmail.value = ''
  usersToAdd.value = []
  newUserInputKey.value = getRandomId('input')
}

async function removeUserFromProject(userId: string) {
  emit('removeMember', userId)
}

const nextOwner = ref<Member | undefined>(undefined)

function transferOwnership() {
  if (nextOwner.value) {
    console.log(nextOwner.value.userId)

    emit('transferOwnership', nextOwner.value.userId)
  }
  nextOwner.value = undefined
}

const actions: DsfrButtonProps[] = [
  {
    label: 'Valider',
    onClick: transferOwnership,
  },
  {
    label: 'Annuler',
    secondary: true,
    onClick() {
      nextOwner.value = undefined
    },
  },
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
        title="Membres du projet"
        data-testid="teamTable"
      >
        <template #header>
          <tr>
            <td />
            <td>
              Utilisateur
            </td>
            <td>Rôles</td>
            <td>
              {{ canManage ? 'Retirer' : 'Quitter' }}
            </td>
            <td
              v-if="canTransfer"
            >
              Promouvoir
            </td>
          </tr>
        </template>
        <UserCt
          :user="project.owner"
          as-table-row
          :selectable="false"
          mode="full"
        >
          <template #extra>
            <td>
              <DsfrTag
                class="shadow shrink"
                label="Propriétaire"
              />
            </td>
            <td />
            <td />
          </template>
        </UserCt>
        <UserCt
          v-for="member in project.members"
          :key="member.userId"
          :user="{ ...member, id: member.userId }"
          as-table-row
          :selectable="false"
          mode="full"
        >
          <template #extra>
            <td>
              <DsfrTag
                v-for="role in getRolesNames(member.roleIds)"
                :key="role"
                class="shadow shrink"
                :label="role"
              />
            </td>
            <td
              v-if="canManage"
              :title="member.userId === userStore.userProfile?.id ? 'Quitter le projet' : `Retirer ${member.firstName} ${member.lastName} du projet`"
              @click="() => removeUserFromProject(member.userId)"
            >
              <v-icon
                class="w-full"
                name="ri:logout-box-r-line"
                fill="#f90"
              />
            </td>
            <td
              v-else-if="member.userId === userStore.userProfile?.id"
              title="Quitter le projet"
              @click="() => removeUserFromProject(member.userId)"
            >
              <v-icon
                class="w-full fr-text-default--warning"
                name="ri:logout-box-r-line"
                fill="#f90"
              />
            </td>
            <td
              v-else
            />
            <td
              v-if="canTransfer"
              @click="() => { nextOwner = member }"
            >
              <v-icon
                class="w-full"
                name="ri:exchange-line"
                fill="#f00"
              />
            </td>
          </template>
        </UserCt>
      </DsfrTable>
      <DsfrModal
        :opened="!!nextOwner"
        title="Tranférer le projet"
        :actions="actions"
        is-alert
        escape-deactivates
        click-outside-deactivates
        @close="nextOwner = undefined"
      >
        <p
          v-if="project.ownerId === userStore.userProfile?.id"
        >
          Attention, en transférant la propriété du projet vous perdrez vos droits sur le projet et deviendrez un membre de l'équipe.
        </p>
        <p
          v-else
        >
          Attention, en transférant la propriété du projet le propiétaire actuel deviendra un simple membre de l'équipe.
        </p>
        <p>
          Le nouveau propriétaire sera: <span class="text-underline font-bold">{{ nextOwner?.firstName }} {{ nextOwner?.lastName }}</span>
        </p>
      </DsfrModal>
      <div class="flex flex-row items-end">
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
          @validate="addUserToProject"
        />
        <DsfrButton
          v-if="props.canManage"
          data-testid="addUserBtn"
          icon-only
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
    </div>
  </div>
</template>
