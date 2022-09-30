<script setup>
import { ref } from 'vue'
defineProps({

})

const projects = ref([{}])

const isGitSourceFilled = ref(false)

// const addProject = () => {
//   projects.value (pusher objet)
// }

</script>

<template>
  <DsfrFieldset
    legend="Commande d'un espace projet"
  >
    <DsfrInput
      v-model="email"
      type="email"
      required
      label="Votre e-mail"
      label-visible
      placeholder="eric.tiquet@interieur.gouv.fr"
    />
    <DsfrInput
      v-model="orgName"
      type="text"
      required
      label="Nom de l'organisation"
      label-visible
      placeholder="SDIT"
    />
    <DsfrInput
      v-model="projectName"
      type="text"
      required
      label="Nom du projet"
      label-visible
      placeholder="MonProjet"
    />
  </DsfrFieldset>
  <div class="fr-mt-4w" />
  <DsfrFieldset
    v-for="(project, index) in projects"
    :key="`project-${index}`"
    legend="Dépôt d'un projet Git"
  >
    <DsfrInput
      v-model="inputValue"
      type="text"
      label="Nom du dépôt git"
      required
      label-visible
    />
    <DsfrInput
      v-model="inputValue"
      type="text"
      label="Nom du dépôt git source"
      label-visible
    />
    <DsfrInput
      v-model="inputValue"
      type="text"
      label="Nom du responsable"
      :required="isGitSourceFilled"
      hint="Nom de l'organisation ou de l'utilisateur propriétaire du dépôt git source"
      label-visible
    />
    <DsfrInput
      v-model="inputValue"
      type="text"
      label="Token d'accès git"
      label-visible
    />
  </DsfrFieldset>
</template>
