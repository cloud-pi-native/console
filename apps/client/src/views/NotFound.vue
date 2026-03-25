<script lang="ts" setup>
import router from '@/router/index.ts'
import { contactEmail } from '@/utils/env.ts'

const redirectButtons = [
  {
    label: 'Page d\'accueil',
    onClick: () => router.push('/'),
  },
  {
    label: 'Contactez-nous',
    onClick: () => { window.location.assign(`mailto:${contactEmail}?subject=404 console Cloud π Native`) },
    secondary: true,
  },
]
</script>

<template>
  <DsfrErrorPage
    :buttons="redirectButtons"
  />
</template>
