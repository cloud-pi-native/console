<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { useProjectStore } from '@/stores/project.js'
import { DsfrButton } from '@gouvminint/vue-dsfr'
import { userSchema } from 'shared/src/schemas/user.js'
import { schemaValidator, isValid } from 'shared/src/utils/schemas.js'
import { initNewUser } from 'shared/src/utils/index.js'

const projectStore = useProjectStore()

const selectedProject = computed(() => projectStore.selectedProject)

const isUserAlreadyInTeam = computed(() => {
  if (!selectedProject.value.users) return
  return !!selectedProject.value.users.find(user => user.email === newUser.value.email)
})

const newUser = ref(initNewUser())

const headers = [
  'E-mail',
  'Rôle',
  'Retirer du projet',
]

const rows = ref([])

const setRows = () => {
  rows.value = []

  rows.value.push([selectedProject.value.owner.email, 'owner', {
    cellAttrs: {
      class: 'fr-fi-close-line !flex justify-center disabled',
      title: `${selectedProject.value.owner.email} ne peut pas être retiré du projet`,
    },
  }])

  if (selectedProject.value.users) {
    selectedProject.value.users.forEach(user => {
      rows.value.push([user.email, 'user', {
        cellAttrs: {
          class: 'fr-fi-close-line fr-text-default--warning !flex justify-center cursor-pointer',
          title: `retirer ${user.email} du projet`,
          onClick: () => removeUserFromProject(user.email),
        },
      }])
    })
  }
}

const addUserToProject = async () => {
  // TODO : récupérer données keycloak de l'utilisateur via son e-mail ?
  newUser.value.id = 'xxxxxx'
  newUser.value.firstName = newUser.value.email.split('.')[0]
  newUser.value.lastName = newUser.value.email.split('.')[1].split('@')[0]

  const keysToValidate = ['id', 'email', 'firstName', 'lastName']
  const errorSchema = schemaValidator(userSchema, newUser.value, keysToValidate)

  if (Object.keys(errorSchema).length || isUserAlreadyInTeam.value) return
  await projectStore.addUserToProject(newUser.value)

  // TODO : voir pq ça vide la dernière row
  // console.log(newUser.value)
  // Object.assign(newUser.value, initNewUser())
  // console.log(newUser.value)
}

const removeUserFromProject = async (userEmail) => {
  await projectStore.removeUserFromProject(userEmail)
}

onMounted(() => {
  setRows()
})

watch(selectedProject.value, () => {
  setRows()
})

</script>

<template>
  <DsoSelectedProject />

  <DsfrTable
    :title="`Membres du projet ${selectedProject.projectName}`"
    :headers="headers"
    :rows="rows"
  />

  <DsfrInput
    v-model="newUser.email"
    hint="Adresse e-mail associée au compte keycloak de l'utilisateur"
    type="text"
    label="Ajouter un utilisateur via son adresse e-mail"
    label-visible
    placeholder="prenom.nom@interieur.gouv.fr"
    :is-valid="!!newUser.email && isValid(userSchema, newUser, 'email') && !isUserAlreadyInTeam"
    :is-invalid="!!newUser.email && (!isValid(userSchema, newUser, 'email') || isUserAlreadyInTeam)"
    class="fr-mb-2w"
  />
  <DsfrAlert
    v-if="isUserAlreadyInTeam"
    description="L'utilisateur associé à cette adresse e-mail fait déjà partie du projet."
    small
    type="error"
    class="fr-mb-2w"
  />
  <DsfrButton
    label="Ajouter l'utilisateur"
    secondary
    icon="ri-user-add-line"
    :disabled="!!newUser.email && (!isValid(userSchema, newUser, 'email') || isUserAlreadyInTeam)"
    @click="addUserToProject()"
  />
</template>

<style>
.test {
  background-color: aliceblue;
}
</style>
