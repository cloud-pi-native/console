<script setup lang="ts">
import { getKeycloak } from './utils/keycloak/keycloak'
import { useUserStore } from './stores/user.js'
import { useProjectStore } from './stores/project.js'
import { useSnackbarStore } from './stores/snackbar.js'

const keycloak = getKeycloak()
const userStore = useUserStore()
const projectStore = useProjectStore()
const snackbarStore = useSnackbarStore()

userStore.setIsLoggedIn()

const isLoggedIn = ref<boolean | undefined>(keycloak.authenticated)
const label = ref(isLoggedIn.value ? 'Se déconnecter' : 'Se connecter')
const to = ref(isLoggedIn.value ? '/logout' : '/login')
const intervalId = ref<number>()
const appVersion: string = process.env.APP_VERSION ? `v${process.env.APP_VERSION}` : 'vpr-dev'

const quickLinks = ref([{
  label,
  to,
  icon: 'ri-account-circle-line',
  iconRight: true,
}])

const refreshProjects = async () => {
  intervalId.value = window.setInterval(async () => {
    await projectStore.getUserProjects()
  }, 30_000)
}

const getSwaggerUrl = () => window?.location?.origin + '/api/v1/swagger-ui/static/index.html'

onBeforeMount(() => {
  clearInterval(intervalId.value)
})

onMounted(async () => {
  if (isLoggedIn.value) {
    await userStore.setUserProfile()
    await refreshProjects()
  }
})

onErrorCaptured((error) => {
  if (error instanceof Error) return snackbarStore.setMessage(error?.message, 'error')
  snackbarStore.setMessage('Une erreur inconnue est survenue.')
  return false
})

watch(label, (label: string) => {
  quickLinks.value[0].label = label
})

</script>

<template>
  <DsfrHeader
    service-title="Console Cloud π Native"
    :logo-text="['Ministère', 'de l’intérieur', 'et des outre-mer']"
    :quick-links="quickLinks"
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
