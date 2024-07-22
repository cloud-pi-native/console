<script setup lang="ts">
import { apiPrefix } from '@cpn-console/shared'
import { getKeycloak } from './utils/keycloak/keycloak.js'
import { useUserStore } from './stores/user.js'
import { useSnackbarStore } from './stores/snackbar.js'
import { useSystemSettingsStore } from './stores/system-settings.js'
import router from './router/index.js'

const keycloak = getKeycloak()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()
const systemStore = useSystemSettingsStore()

userStore.setIsLoggedIn()

const isLoggedIn = ref<boolean | undefined>(keycloak.authenticated)
const label = ref(isLoggedIn.value ? 'Se déconnecter' : 'Se connecter')
const to = ref(isLoggedIn.value ? '/logout' : '/login')

const appVersion: string = process.env.APP_VERSION ? `v${process.env.APP_VERSION}` : 'vpr-dev'

const quickLinks = ref([{
  label,
  to,
  icon: 'ri-account-circle-line',
  iconRight: true,
}])

const getSwaggerUrl = () => window?.location?.origin + `${apiPrefix}/swagger-ui/static/index.html`

onErrorCaptured((error) => {
  if (error instanceof Error) {
    snackbarStore.setMessage(error?.message, 'error')
  } else {
    snackbarStore.setMessage('Une erreur inconnue est survenue.', 'error')
  }
  snackbarStore.isWaitingForResponse = false
  return false
})

watch(label, (label: string) => {
  quickLinks.value[0].label = label
})

userStore.$subscribe(() => {
  if (router.currentRoute.value.fullPath.startsWith('/admin') && userStore.adminPerms === 0n) {
    window.location.pathname = '/'
  }
})

</script>

<template>
  <DsfrHeader
    service-title="Console Cloud π Native"
    :logo-text="['Ministère', 'de l’intérieur', 'et des outre-mer']"
    :quick-links="quickLinks"
  />
  <DsfrNotice
    v-if="systemStore.systemSettingsByKey['maintenance']?.value === 'on'"
    title="Le mode Maintenance est actuellement activé"
    data-testid="maintenance-notice"
  />
  <div class="fr-container fr-grid-row fr-mb-8w">
    <div class="fr-col-12 fr-col-md-3">
      <SideMenu />
    </div>
    <div class="fr-col-12 fr-col-md-9 fr-py-6v">
      <router-view />
    </div>
    <DsoSnackbar />
  </div>

  <DsfrFooter
    class="dso-footer"
    a11y-compliance="partiellement conforme"
    :logo-text="['Ministère', 'de l’Intérieur', 'et des Outre-Mer']"
    :mandatory-links="[]"
  >
    <template #description>
      <div
        class="flex gap-2 justify-end"
      >
        <a
          data-testid="swaggerUrl"
          :href="getSwaggerUrl()"
          title="accéder au swagger"
        >
          swagger
        </a>
        <a
          data-testid="appVersionUrl"
          :href="`https://github.com/cloud-pi-native/console/releases/tag/${appVersion}`"
          title="accéder au code source"
        >
          {{ appVersion }}
        </a>
      </div>
    </template>
  </DsfrFooter>
</template>

<style>
.fr-container {
  max-width: 100%;
}
</style>
