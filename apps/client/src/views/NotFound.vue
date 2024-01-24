<script lang="ts" setup>
import router from '@/router/index.js'

const redirectButtons = [
  {
    label: 'Page d\'accueil',
    onClick: () => router.push('/'),
  },
  {
    label: 'Contactez-nous',
    onClick: () => { window.location.assign('mailto:cloudpinative-relations@interieur.gouv.fr?subject=404 console Cloud π Native') },
    secondary: true,
  },
]
</script>

<template>
  <DsfrErrorPage
    :buttons="redirectButtons"
  />
</template>
