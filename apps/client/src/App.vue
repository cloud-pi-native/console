<script setup lang="ts">
import { swaggerUiPath } from '@cpn-console/shared'
import { getKeycloak } from './utils/keycloak/keycloak.js'
import { useSnackbarStore } from './stores/snackbar.js'
import { useSystemSettingsStore } from './stores/system-settings.js'
import { useProjectStore } from './stores/project.js'
import { useUserStore } from './stores/user.js'
import { useAdminRoleStore } from './stores/admin-role.js'
import { useServiceStore } from '@/stores/services-monitor.js'

const keycloak = getKeycloak()
const snackbarStore = useSnackbarStore()
const systemStore = useSystemSettingsStore()
const projectStore = useProjectStore()
const userStore = useUserStore()
const adminRoleStore = useAdminRoleStore()

const isLoggedIn = ref<boolean | undefined>(keycloak.authenticated)

const appVersion: string = process.env.APP_VERSION ? `v${process.env.APP_VERSION}` : 'vpr-dev'

const quickLinks = computed(() => [{
  label: isLoggedIn.value ? 'Se déconnecter' : 'Se connecter',
  to: isLoggedIn.value ? '/logout' : '/login',
  icon: 'ri:account-circle-line',
  iconRight: true,
}])

onErrorCaptured((error) => {
  if (error instanceof Error) {
    console.trace(error)
    snackbarStore.setMessage(error?.message, 'error')
  } else {
    snackbarStore.setMessage('Une erreur inconnue est survenue.', 'error')
  }
  snackbarStore.isWaitingForResponse = false
  return false
})

const serviceStore = useServiceStore()
onBeforeMount(async () => {
  serviceStore.startHealthPolling()
  serviceStore.checkServicesHealth()
})
watch(userStore, async () => {
  if (userStore.isLoggedIn) {
    if (!adminRoleStore.roles.length) {
      await adminRoleStore.listRoles()
    }
    if (!projectStore.projects.length) {
      await projectStore.listMyProjects()
    }
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
    v-if="systemStore.systemSettingsByKey.maintenance?.value === 'on'"
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
    <SelectProject />
  </div>

  <DsfrFooter
    class="dso-footer"
    a11y-compliance="partiellement conforme"
    :mandatory-links="[]"
  >
    <template #description>
      <div
        class="flex gap-2 justify-end"
      >
        <a
          data-testid="swaggerUrl"
          :href="swaggerUiPath"
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

.fr-header__logo {
  display: none;
}
</style>
