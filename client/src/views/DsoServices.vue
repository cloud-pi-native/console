<script setup>
import { ref } from 'vue'

// TODO : récupérer les services dynamiquement
// TODO : importer tous les logos possibles
const tiles = ref([{
  title: 'Gitlab',
  imgSrc: 'logoGitlab',
  description: 'GitLab est un service d\'hébergement de code source et de pipeline CI/CD',
  to: 'https://about.gitlab.com/',
}])

</script>

<template>
  <DsfrTiles
    :tiles="tiles"
    class="fr-mt-2v"
  />
</template>
