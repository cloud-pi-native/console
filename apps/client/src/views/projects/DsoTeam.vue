<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { useProjectStore } from '@/stores/project.js'
import { DsfrTag } from '@gouvminint/vue-dsfr'
import { userSchema } from 'shared/src/schemas/user.js'
import { schemaValidator, isValid } from 'shared/src/utils/schemas.js'

const projectStore = useProjectStore()

const selectedProject = computed(() => projectStore.selectedProject)

const newUserEmail = ref('')

const newUser = ref({})

const headers = [
  'E-mail',
  'Prénom',
  'Nom',
  'Rôle',
]

const rows = ref([])

// TODO : gérer DsfrTags
const setRows = () => {
  rows.value = []

  rows.value.push([...Object.values(selectedProject.value.owner).filter(val => val !== selectedProject.value.owner.id), {
    component: DsfrTag,
    label: 'owner',
    class: 'fr-tag--dismiss',
    disabled: true,
    selected: false,
  }])

  if (selectedProject.value.users) {
    selectedProject.value.users.forEach(user => {
      rows.value.push([...Object.values(user).filter(val => val !== user.id), {
        component: DsfrTag,
        label: 'user',
        class: 'fr-tag--dismiss',
        disabled: false,
        selected: false,
      }])
    })
  }
}

const addUserToProject = () => {
  // TODO : récupérer données keycloak de l'utilisateur via son e-mail ?
  newUser.value.id = 'xxxxxx'
  newUser.value.email = newUserEmail.value
  newUser.value.firstName = newUserEmail.value.split('.')[0]
  newUser.value.lastName = newUserEmail.value.split('.')[1].split('@')[0]

  const keysToValidate = ['id', 'email', 'firstName', 'lastName']
  const errorSchema = schemaValidator(userSchema, newUser.value, keysToValidate)

  if (Object.keys(errorSchema).length || selectedProject.value.users.find(user => user.email === newUserEmail.value)) return
  projectStore.addUserToProject(newUser.value)
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
    v-model="newUserEmail"
    hint="Adresse e-mail associée au compte keycloak de l'utilisateur"
    type="text"
    label="Ajouter un utilisateur via son adresse e-mail"
    label-visible
    placeholder="prenom.nom@interieur.gouv.fr"
    :is-valid="!!newUserEmail && isValid(userSchema, newUser, 'email')"
    :is-invalid="!!newUserEmail && !isValid(userSchema, newUser, 'email')"
    class="fr-mb-2w"
  />
  <DsfrButton
    label="Ajouter l'utilisateur"
    secondary
    icon="ri-user-add-line"
    @click="addUserToProject()"
  />
</template>
