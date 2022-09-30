<script setup>
import SideMenu from './components/SideMenu.vue'

</script>

<template>
  <DsfrHeader
    service-title="Portail Cloud PI Native"
    :logo-text="['Ministère', 'de l’intérieur']"
  />
  <div class="fr-container  fr-grid-row">
    <div class="fr-col-12 fr-col-md-4">
      <SideMenu />
    </div>
    <div class="fr-col-12 fr-col-md-8 fr-py-12v">
      <router-view />
      <VIcon name="ri-flag-line" />
    </div>
  </div>
</template>
