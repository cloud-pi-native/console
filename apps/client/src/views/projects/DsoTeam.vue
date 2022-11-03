<script setup>
import { ref, computed, onMounted } from 'vue'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { useProjectStore } from '@/stores/project.js'
import { DsfrTag } from '@gouvminint/vue-dsfr/types/index.js'

const projectStore = useProjectStore()

const selectedProject = computed(() => projectStore.selectedProject)

const headers = [
  'id',
  'e-mail',
  'prénom',
  'nom',
  'rôle',
]

const rows = ref([])

// TODO : gérer DsfrTags
const setRows = () => {
  rows.value = []

  rows.value.push([...Object.entries(selectedProject.value.owner), {
    component: DsfrTag,
    label: 'owner',
    class: 'fr-tag--dismiss',
    disabled: true,
    selected: false,
  }])

  selectedProject.value.users.forEach(user => {
    rows.value.push([...Object.entries(user), {
      component: DsfrTag,
      label: 'user',
      class: 'fr-tag--dismiss',
      disabled: false,
      selected: false,
    }])
  })
}

onMounted(() => {
  setRows()
})

</script>

<template>
  <DsoSelectedProject />
  <p>Team</p>
  <DsfrTable
    :title="`Gérer les utilisateurs du projet ${selectedProject.value.projectName}`"
    :headers="headers"
    :rows="rows"
  />
</template>
