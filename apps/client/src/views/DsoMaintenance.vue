<script lang="ts" setup>
import { contactEmail } from '@/utils/env'

interface MailType {
  to: string
  label: string
  address: string
}

const mail: MailType = {
  to: `mailto:${contactEmail}?subject=Maintenance console Cloud π Native`,
  label: `Nous écrire (${contactEmail})`,
  address: contactEmail,
}

function setWindowLocation(to: string) {
  window.location = to as string & Location
}
</script>

<template>
  <DsfrCallout
    title="Maintenance"
    content="La console Cloud π Native est actuellement en maintenance. À très vite !"
    icon="ri:tools-line"
  />

  <DsfrButton
    data-testid="contact-us"
    label="Contactez-nous"
    secondary
    icon="ri:mail-line"
    :title="mail.address"
    @click="setWindowLocation(mail.to)"
  />
</template>
