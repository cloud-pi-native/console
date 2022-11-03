<script setup>
import { ref, computed, onMounted } from 'vue'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { useProjectStore } from '@/stores/project.js'
import { DsfrTag } from '@gouvminint/vue-dsfr'

const projectStore = useProjectStore()

const selectedProject = computed(() => projectStore.selectedProject)

const headers = [
  'id',
  'E-mail',
  'Prénom',
  'Nom',
  'Rôle',
]

const rows = ref([])

// TODO : gérer DsfrTags
const setRows = () => {
  rows.value = []

  rows.value.push([...Object.values(selectedProject.value.owner), {
    component: DsfrTag,
    label: 'owner',
    class: 'fr-tag--dismiss',
    disabled: true,
    selected: false,
  }])

  if (selectedProject.value.users) {
    selectedProject.value.users.forEach(user => {
      rows.value.push([...Object.values(user), {
        component: DsfrTag,
        label: 'user',
        class: 'fr-tag--dismiss',
        disabled: false,
        selected: false,
      }])
    })
  }

  console.log({ rows: rows.value })
}

onMounted(() => {
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
  <DsfrButton
    label="Ajouter un utilisateur"
    secondary
    icon="ri-user-add-line"
    @click="onClick()"
  />
</template>
