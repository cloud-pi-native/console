<script setup lang="ts">
import { logger } from '@cpn-console/logger/browser'
import { swaggerUiPath } from '@cpn-console/shared'
import { useServiceStore } from '@/stores/services-monitor.js'
import ReloadPrompt from './components/ReloadPrompt.vue'
import { useAdminRoleStore } from './stores/admin-role.js'

import { useProjectStore } from './stores/project.js'
import { useSnackbarStore } from './stores/snackbar.js'
import { useSystemSettingsStore } from './stores/system-settings.js'
import { useUserStore } from './stores/user.js'
import { getKeycloak } from './utils/keycloak/keycloak.js'

const keycloak = getKeycloak()
const snackbarStore = useSnackbarStore()
const systemStore = useSystemSettingsStore()
const projectStore = useProjectStore()
const userStore = useUserStore()
const adminRoleStore = useAdminRoleStore()

const isLoggedIn = ref<boolean | undefined>(keycloak.authenticated)

const REPO_URL = 'https://github.com/cloud-pi-native/console'
const rawAppVersion = process.env.APP_VERSION

function isPullRequestPreview(version: string): boolean {
  return /^pr-\d+$/.test(version)
}
function isDeployedCommit(version: string): boolean {
  return /^[0-9a-f]{7,40}$/.test(version.replace(/^sha-/, ''))
}
function isReleaseTag(version: string): boolean {
  return /^v?\d+\.\d+\.\d+/.test(version)
}

function appVersionLabel(version: string | undefined): string {
  if (!version) return 'pr-dev'
  if (isReleaseTag(version)) return version.startsWith('v') ? version : `v${version}`
  return version
}

function appVersionUrlFor(version: string | undefined): string {
  if (!version) return `${REPO_URL}/releases`
  if (isPullRequestPreview(version)) return `${REPO_URL}/pull/${version.slice(3)}`
  if (isDeployedCommit(version)) return `${REPO_URL}/commit/${version.replace(/^sha-/, '')}`
  if (isReleaseTag(version)) return `${REPO_URL}/releases/tag/v${version.replace(/^v/, '')}`
  return `${REPO_URL}/releases`
}

const appVersion = appVersionLabel(rawAppVersion)
const appVersionUrl = appVersionUrlFor(rawAppVersion)

const quickLinks = computed(() => [{
  label: isLoggedIn.value ? 'Se déconnecter' : 'Se connecter',
  to: isLoggedIn.value ? '/logout' : '/login',
  icon: 'ri:account-circle-line',
  iconRight: true,
}])

onErrorCaptured((error) => {
  if (error instanceof Error) {
    logger.error({ err: error }, 'Unhandled Vue error')
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
  <div
    class="min-h-screen min-w-screen flex flex-col"
  >
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
    <div class="flex flex-row <md:flex-col grow">
      <SideMenu class="md:w-max min-w-80" />
      <div class="grow fr-py-4w fr-pr-4w">
        <router-view />
      </div>
      <DsoSnackbar class="w-full fixed flex justify-center" />
      <SelectProject class="block <dsfrmenu:hidden" />
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
            :href="`${swaggerUiPath}-server-nestjs`"
            target="_blank"
            title="accéder au swagger UI"
          >
            swagger
          </a>
          <a
            data-testid="swaggerUrl-legacy"
            :href="`${swaggerUiPath}-server`"
            target="_blank"
            title="accéder au swagger UI (legacy)"
          >
            swagger (legacy)
          </a>
          <a
            data-testid="appVersionUrl"
            :href="appVersionUrl"
            title="accéder au code source"
          >
            {{ appVersion }}
          </a>
        </div>
      </template>
    </DsfrFooter>
    <ReloadPrompt />
  </div>
</template>

<style>
.fr-header .fr-container {
  max-width: 100%;
}

.fr-header__logo {
  display: none;
}
</style>
