<script setup>
import SideMenu from "./components/SideMenu.vue";

const serviceTitle = 'Portail Cloud PI Native'
const logoText = ['Ministère', 'de l’intérieur']

</script>

<template>
  <DsfrHeader
    :service-title="serviceTitle"
    :logo-text="logoText"
  />
  <div class="fr-container  fr-grid-row">
    <div class="fr-col-12 fr-col-md-4">
  <SideMenu/>
  </div>
  <div class="fr-col-12 fr-col-md-8 fr-py-12v">
    <router-view />
    <VIcon name="ri-flag-line" />
    </div>
  </div>
</template>
