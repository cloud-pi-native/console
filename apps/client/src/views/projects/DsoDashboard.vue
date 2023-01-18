<script setup>
// import { useProjectStore } from '@/stores/project.js'
import DsoSelectedProject from './DsoSelectedProject.vue'

// const projectStore = useProjectStore()
// TODO : avoir le status à jour en permanence
</script>

<template>
  <DsoSelectedProject />
  <!-- <div
    class="flex justify-between"
  >
    <DsfrBadge
      v-if="projectStore.selectedProject.status === 'initializing'"
      type="info"
      label="Projet en cours de création"
    />
    <DsfrBadge
      v-else-if="projectStore.selectedProject.status === 'failed'"
      type="error"
      label="Echec de création du projet"
    />
    <DsfrBadge
      v-else
      type="success"
      label="Projet créé"
    />
    <DsfrBadge
      v-if="projectStore.selectedProject.locked"
      type="warning"
      label="Projet verrouillé"
    />
  </div> -->
</template>
