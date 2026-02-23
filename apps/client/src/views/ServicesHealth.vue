<script  lang="ts" setup>
import { type Ref, onBeforeMount, ref } from 'vue'
import { alertTypeMapper, useServiceStore } from '@/stores/services-monitor.js'
import { AdminAuthorized } from '@cpn-console/shared'
import { useUserStore } from '@/stores/user.js'
import TimeAgo from 'javascript-time-ago'
import fr from 'javascript-time-ago/locale/fr'

const serviceStore = useServiceStore()
const userStore = useUserStore()

const isUpdating: Ref<boolean> = ref(true)
// Add locale-specific relative date/time formatting rules.
TimeAgo.addLocale(fr)

// Create relative date/time formatter.
const timeAgo = new TimeAgo('fr-FR', { })

async function checkServicesHealth() {
  isUpdating.value = true
  await serviceStore.checkServicesHealth().finally(() => {
    isUpdating.value = false
  })
}

async function refreshServicesHealth() {
  isUpdating.value = true
  await serviceStore.refreshServicesHealth().finally(() => {
    isUpdating.value = false
  })
}

onBeforeMount(async () => {
  await checkServicesHealth()
})
</script>

<template>
  <h1
    class="fr-h3"
  >
    Status des services de la plateforme DSO
  </h1>
  <div class="flex justify-between">
    <DsfrBadge
      data-testid="services-health-badge"
      :type="serviceStore.servicesHealth.status"
      :label="serviceStore.servicesHealth.message"
    />
    <div class="flex gap-2">
      <DsfrButton
        v-if="AdminAuthorized.ListSystem(userStore.adminPerms)"
        data-testid="serviceCauseBtn"
        :title="!serviceStore.displayCause ? 'Afficher les messages d\'erreur' : 'Masquer les messages d\'erreur'"
        secondary
        icon-only
        :icon="!serviceStore.displayCause ? 'ri:filter-off-line' : 'ri:filter-line'"
        @click="serviceStore.toggleDisplayCause"
      />
      <DsfrButton
        data-testid="check-btn"
        title="Renouveler l'appel"
        secondary
        icon-only
        icon="ri:refresh-line"
        :disabled="!!isUpdating"
        @click="checkServicesHealth"
      />
      <DsfrButton
        v-if="AdminAuthorized.ManageSystem(userStore.adminPerms)"
        data-testid="refresh-btn"
        label="Effacer le cache"
        secondary
        :disabled="!!isUpdating"
        @click="refreshServicesHealth"
      />
    </div>
  </div>
  <div
    class="md:grid md:grid-cols-3 md:gap-3 items-center justify-between"
    data-testid="box-info"
  >
    <DsfrAlert
      v-for="service in serviceStore.services"
      :key="service.name"
      :data-testid="`${service.name}-info`"
      :title="service.name"
      class="pb-5 fr-mt-2w"
      :type="alertTypeMapper[service.status]"
    >
      <div class="inline">
        {{ service.message }}
      </div>
      <div
        v-if="serviceStore.displayCause && service.cause"
        :title="service.cause"
        class="ml-2 inline"
      >
        <v-icon
          name="ri:question-line"
        />
      </div>
      <div>{{ timeAgo.format(new Date(service.lastUpdateTimestamp), 'round') }}</div>
    </DsfrAlert>
  </div>
</template>
