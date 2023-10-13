<script lang="ts" setup>
import { ref, computed, watch, type Ref, onBeforeMount } from 'vue'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { useProjectStore } from '@/stores/project.js'
import { useProjectUserStore } from '@/stores/project-user.js'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { DsfrButton, getRandomId } from '@gouvminint/vue-dsfr'
import { schemaValidator, userSchema } from '@dso-console/shared'
import SuggestionInput from '@/components/SuggestionInput.vue'
import LoadingCt from '@/components/LoadingCt.vue'
import pDebounce from 'p-debounce'

const projectStore = useProjectStore()
const projectUserStore = useProjectUserStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()

const headers = [
  'E-mail',
  'Rôle',
  'Retirer du projet',
]

const project = computed(() => projectStore.selectedProject)

const isUserAlreadyInTeam = computed(() => {
  const allUsers = project.value?.roles
  return !!allUsers?.find(role => role.user.email === newUserEmail.value)
})

const owner = computed(() => projectStore.selectedProjectOwner)
const isOwner = computed(() => owner.value?.id === userStore.userProfile.id)

const newUserInputKey = ref(getRandomId('input'))
const newUserEmail = ref('')
const usersToAdd = ref([])
const isUpdatingProjectMembers = ref(false)
const rows: Ref<any[][] | never> = ref([])
const lettersNotMatching = ref('')
const tableKey = ref(getRandomId('table'))

const setRows = () => {
  rows.value = []

  if (project.value?.roles?.length) {
    project.value.roles?.forEach(role => {
      if (role.role === 'owner') {
        rows.value.unshift([
          owner.value?.email,
          'owner',
          {
            cellAttrs: {
              class: 'fr-fi-close-line !flex justify-center disabled',
              title: `${owner.value?.email} ne peut pas être retiré du projet`,
            },
          },
        ])
        return
      }
      rows.value.push([
        role.user.email,
        'user',
        {
          cellAttrs: {
            class: `fr-fi-close-line !flex justify-center ${isOwner.value ? 'cursor-pointer fr-text-default--warning' : 'disabled'}`,
            title: isOwner.value ? `retirer ${role.user.email} du projet` : 'vous n\'avez pas les droits suffisants pour retirer un membre du projet',
            onClick: () => removeUserFromProject(role.user.id),
          },
        },
      ])
    })
  }
  tableKey.value = getRandomId('table')
}

const retrieveUsersToAdd = pDebounce(async (letters: string) => {
  // Ne pas lancer de requête à moins de 3 caractères tapés
  if (letters.length < 3) return
  // Ne pas relancer de requête à chaque lettre ajoutée si aucun user ne correspond aux premières lettres données
  if (lettersNotMatching.value && letters.includes(lettersNotMatching.value) && !usersToAdd.value.length) return
  usersToAdd.value = (await projectUserStore.getMatchingUsers(letters)).map(userToAdd => userToAdd.email)
  // Stockage des lettres qui ne renvoient aucun résultat
  if (!usersToAdd.value.length) {
    lettersNotMatching.value = letters
  }
}, 300)

const addUserToProject = async (email: string) => {
  isUpdatingProjectMembers.value = true
  const keysToValidate = ['email']
  const errorSchema = schemaValidator(userSchema, { email }, { keysToValidate })
  if (Object.keys(errorSchema).length || isUserAlreadyInTeam.value) return
  try {
    await projectUserStore.addUserToProject({ email })
  } catch (error) {
    if (error instanceof Error) {
      snackbarStore.setMessage(error.message)
    } else {
      snackbarStore.setMessage('échec d\'ajout de l\'utilisateur au projet')
    }
  }

  newUserEmail.value = ''
  usersToAdd.value = []
  newUserInputKey.value = getRandomId('input')
  isUpdatingProjectMembers.value = false
}

const removeUserFromProject = async (userId: string) => {
  isUpdatingProjectMembers.value = true
  try {
    await projectUserStore.removeUserFromProject(userId)
  } catch (error) {
    if (error instanceof Error) {
      snackbarStore.setMessage(error.message)
    } else {
      snackbarStore.setMessage('échec de retrait de l\'utilisateur du projet')
    }
  }
  isUpdatingProjectMembers.value = false
}

onBeforeMount(() => {
  setRows()
})

watch(project, () => {
  setRows()
})

</script>

<template>
  <DsoSelectedProject />

  <div
    class="relative"
  >
    <DsfrTable
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
    <LoadingCt
      :show-loader="isUpdatingProjectMembers"
      description="Mise à jour de l'équipe projet"
    />
  </div>
</template>
