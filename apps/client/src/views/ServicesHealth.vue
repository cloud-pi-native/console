<script  lang="ts" setup>
import type { Ref } from 'vue'
import { AdminAuthorized } from '@cpn-console/shared'
import TimeAgo from 'javascript-time-ago'
import fr from 'javascript-time-ago/locale/fr'
import { onMounted, ref } from 'vue'
import { alertTypeMapper, useServiceStore } from '@/stores/services-monitor.js'
import { useUserStore } from '@/stores/user.js'

const serviceStore = useServiceStore()
const userStore = useUserStore()

const isUpdating: Ref<boolean> = ref(true)
// Add locale-specific relative date/time formatting rules.
TimeAgo.addLocale(fr)

// Create relative date/time formatter.
const timeAgo = new TimeAgo('fr-FR', { })

const severityOrder: Record<string, number> = {
  'En échec': 0,
  Dégradé: 1,
  Inconnu: 2,
  OK: 3,
}

const sortedServices = computed(() =>
  [...serviceStore.services].sort(
    (first, second) => (severityOrder[first.status] ?? 4) - (severityOrder[second.status] ?? 4),
  ),
)

const lastUpdateLabel = computed(() => {
  const timestamps = serviceStore.services
    .map(service => service.lastUpdateTimestamp)
    .filter(timestamp => timestamp > 0)
  if (!timestamps.length) return 'Aucune vérification effectuée'
  const latest = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(Math.max(...timestamps)))
  return `Dernière vérification : ${latest}`
})

const STATUS_BUCKETS = [
  { status: 'En échec', label: 'en échec', plural: false },
  { status: 'Dégradé', label: 'dégradé', plural: true },
  { status: 'OK', label: 'opérationnel', plural: true },
  { status: 'Inconnu', label: 'inconnu', plural: true },
] as const

function formatStatusCount(count: number, label: string, plural: boolean): string {
  if (!count) return ''
  return `${count} ${label}${plural && count > 1 ? 's' : ''}`
}

const healthSummary = computed(() => {
  const total = serviceStore.services.length
  if (!total) return 'Aucun service à afficher'

  const details = STATUS_BUCKETS
    .map(bucket => formatStatusCount(
      serviceStore.services.filter(service => service.status === bucket.status).length,
      bucket.label,
      bucket.plural,
    ))
    .filter(Boolean)

  return `${total} service${total > 1 ? 's' : ''} : ${details.join(', ')}`
})

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

onMounted(async () => {
  await checkServicesHealth()
})
</script>

<template>
  <h1
    class="fr-h3"
  >
    État des services de la plateforme DSO
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
        :aria-label="!serviceStore.displayCause ? 'Afficher les messages d\'erreur' : 'Masquer les messages d\'erreur'"
        secondary
        icon-only
        :icon="!serviceStore.displayCause ? 'ri:filter-off-line' : 'ri:filter-line'"
        @click="serviceStore.toggleDisplayCause"
      />
      <DsfrButton
        data-testid="check-btn"
        title="Renouveler l'appel"
        aria-label="Renouveler l'appel"
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
  <p class="fr-text--sm fr-mb-2w" data-testid="services-health-last-update">
    {{ lastUpdateLabel }}
  </p>
  <p class="fr-text--sm fr-mb-2w" data-testid="services-health-summary">
    {{ healthSummary }}
  </p>
  <div
    class="fr-grid-row fr-grid-row--gutters"
    data-testid="box-info"
  >
    <div
      v-for="service in sortedServices"
      :key="service.name"
      class="fr-col-12 fr-col-md-6 fr-col-lg-4"
    >
      <DsfrAlert
        :data-testid="`${service.name}-info`"
        :title="service.name"
        class="fr-mt-2w"
        :type="alertTypeMapper[service.status]"
      >
        <div class="inline">
          {{ service.message }}
        </div>
        <p
          v-if="serviceStore.displayCause && service.cause"
          class="fr-text--sm fr-mt-1w fr-mb-0"
          style="white-space: pre-wrap;"
        >
          <strong>Cause :</strong> {{ service.cause }}
        </p>
        <div>{{ timeAgo.format(new Date(service.lastUpdateTimestamp), 'round') }}</div>
      </DsfrAlert>
    </div>
  </div>
</template>
