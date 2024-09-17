<script lang="ts" setup>
interface MailType {
  to: string
  label: string
  address: string
}

const mail: MailType = {
  to: 'mailto:cloudpinative-relations@interieur.gouv.fr?subject=Maintenance console Cloud π Native',
  label: 'Nous écrire (cloudpinative-relations@interieur.gouv.fr)',
  address: 'cloudpinative-relations@interieur.gouv.fr',
}

function setWindowLocation(to: string) {
  window.location = to as string & Location
}
</script>

<template>
  <DsfrCallout
    title="Maintenance"
    content="La console Cloud π Native est actuellement en maintenance. À très vite !"
    icon="ri:tools-fill"
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
