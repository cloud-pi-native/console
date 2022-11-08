<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { useProjectStore } from '@/stores/project.js'
import { DsfrButton, DsfrTag } from '@gouvminint/vue-dsfr'
import { userSchema } from 'shared/src/schemas/user.js'
import { schemaValidator, isValid } from 'shared/src/utils/schemas.js'

const projectStore = useProjectStore()

const selectedProject = computed(() => projectStore.selectedProject)

const isUserAlreadyInTeam = computed(() => !!selectedProject.value.users
  .find(user => user.email === newUser.value.email))

const newUser = ref({
  id: undefined,
  email: undefined,
  firstName: undefined,
  lastName: undefined,
})

const headers = [
  'E-mail',
  'Rôle',
]

const rows = ref([])

const setRows = () => {
  rows.value = []

  rows.value.push([selectedProject.value.owner.email, {
    component: DsfrTag,
    label: 'owner',
    class: 'fr-tag--dismiss',
    tagName: 'button',
    disabled: true,
    selected: false,
  }])

  if (selectedProject.value.users) {
    selectedProject.value.users.forEach(user => {
      rows.value.push([user.email, {
        onClick: removeUserFromProject(user.email),
        component: DsfrTag,
        label: 'user',
        class: 'fr-tag--dismiss',
        tagName: 'button',
        disabled: false,
        selected: false,
      }])
    })
  }
}

console.log('rows: ', rows.value)

const addUserToProject = async () => {
  // TODO : récupérer données keycloak de l'utilisateur via son e-mail ?
  newUser.value.id = 'xxxxxx'
  newUser.value.firstName = newUser.value.email.split('.')[0]
  newUser.value.lastName = newUser.value.email.split('.')[1].split('@')[0]

  const keysToValidate = ['id', 'email', 'firstName', 'lastName']
  const errorSchema = schemaValidator(userSchema, newUser.value, keysToValidate)

  if (Object.keys(errorSchema).length || isUserAlreadyInTeam.value) return
  await projectStore.addUserToProject(newUser.value)

  // TODO : remettre newUser à 0
  // TypeError: can't access property "text", _ctx.field is undefined
  // Object.keys(newUser.value).forEach(key => {
  //   newUser.value[key] = undefined
  // })
}

const removeUserFromProject = async (userEmail) => {
  console.log(userEmail)
  await projectStore.removeUserFromProject(userEmail)
}

onMounted(() => {
  setRows()
})

// TODO : comprendre pq watch sur la computed ne fonctionne pas
watch(projectStore.selectedProject, () => {
  setRows()
})

</script>

<template>
  <DsoSelectedProject />
  <h1
    class="fr-h1"
  >
    Team
  </h1>
  <DsfrTable
    :title="`Utilisateurs du projet ${selectedProject.projectName}`"
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
