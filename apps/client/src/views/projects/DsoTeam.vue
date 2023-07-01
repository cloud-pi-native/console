<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { useProjectStore } from '@/stores/project.js'
import { useProjectUserStore } from '@/stores/project-user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { DsfrButton } from '@gouvminint/vue-dsfr'
import { schemaValidator, isValid, instanciateSchema, userSchema } from 'shared'

const projectStore = useProjectStore()
const projectUserStore = useProjectUserStore()
const snackbarStore = useSnackbarStore()

const project = computed(() => projectStore.selectedProject)

const isUserAlreadyInTeam = computed(() => {
  const allUsers = project.value.users
  return !!allUsers?.find(user => user.email === newUser.value.email)
})

const owner = computed(() => project.value.users?.find(user => user?.roles?.role === 'owner'))

const newUser = ref({})

const headers = [
  'E-mail',
  'Rôle',
  'Retirer du projet',
]

const rows = ref([])

const setRows = () => {
  rows.value = []

  if (project.value.users?.length) {
    project.value.users?.forEach(user => {
      if (user.roles?.role === 'owner') {
        rows.value.unshift([
          owner.value.email,
          'owner',
          {
            cellAttrs: {
              class: 'fr-fi-close-line !flex justify-center disabled',
              title: `${owner.value.email} ne peut pas être retiré du projet`,
            },
          },
        ])
        return
      }
      rows.value.push([
        user.email,
        'user',
        {
          cellAttrs: {
            class: 'fr-fi-close-line !flex justify-center cursor-pointer fr-text-default--warning',
            title: `retirer ${user.email} du projet`,
            onClick: () => removeUserFromProject(user.id),
          },
        },
      ])
    })
  }
}

const addUserToProject = async () => {
  // TODO : #66 : récupérer données keycloak de l'utilisateur via son e-mail
  newUser.value.id = 'xxxxxx'
  newUser.value.firstName = newUser.value.email.split('.')[0]
  newUser.value.lastName = newUser.value.email.split('.')[1].split('@')[0]

  const keysToValidate = ['id', 'email', 'firstName', 'lastName']
  const errorSchema = schemaValidator(userSchema, newUser.value, { keysToValidate })
  if (Object.keys(errorSchema).length || isUserAlreadyInTeam.value) return
  try {
    await projectUserStore.addUserToProject(newUser.value)
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }

  newUser.value = instanciateSchema({ schema: userSchema }, undefined)
}

const removeUserFromProject = async (userId) => {
  try {
    await projectUserStore.removeUserFromProject(userId)
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

onMounted(() => {
  newUser.value = instanciateSchema({ schema: userSchema }, undefined)
  setRows()
})

watch(project, () => {
  setRows()
})

</script>

<template>
  <DsoSelectedProject />

  <DsfrTable
    data-testid="teamTable"
    :title="`Membres du projet ${project?.name}`"
    :headers="headers"
    :rows="rows"
  />

  <!-- TODO : #66 suggest sur utilisateurs keycloak, ajout dans notre db si pas existant -->
  <!-- TODO : enlever v-if avec #132 -->
  <div
    v-if="false"
  >
    <DsfrInput
      v-model="newUser.email"
      data-testid="addUserInput"
      hint="Adresse e-mail associée au compte keycloak de l'utilisateur"
      type="text"
      label="Ajouter un utilisateur via son adresse e-mail"
      :disabled="project?.locked"
      label-visible
      placeholder="prenom.nom@interieur.gouv.fr"
      :is-valid="!!newUser.email && isValid(userSchema, newUser, 'email') && !isUserAlreadyInTeam"
      :is-invalid="!!newUser.email && (!isValid(userSchema, newUser, 'email') || isUserAlreadyInTeam)"
      class="fr-mb-2w"
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
      :disabled="!!newUser.email && (!isValid(userSchema, newUser, 'email') || isUserAlreadyInTeam)"
      @click="addUserToProject()"
    />
  </div>
</template>
