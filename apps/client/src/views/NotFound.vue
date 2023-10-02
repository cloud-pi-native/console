<script lang="ts" setup>

import router from '@/router/index.js'
// const redirectButtons = [
//   {
//     label: 'Page d\'accueil',
//     link: '/home',
//   },
//   {
//     label: 'Contactez-nous',
//     link: '/home',
//     secondary: true,
//   },
// ]
</script>

<template>
  <!-- <DsfrErrorPage
  :buttons="redirectButtons"
  /> -->
  <h1>La page que vous recherchez n'existe pas.</h1>
  <DsfrButton
    label="Retour à l'accueil"
    @click=" router.push('/')"
  />
</template>
