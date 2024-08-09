<script  lang="ts" setup>
import { useServiceStore, alertTypeMapper } from '@/stores/services-monitor.js'
import { ref, onBeforeMount, type Ref } from 'vue'

const serviceStore = useServiceStore()

const isUpdating: Ref<boolean> = ref(true)

const checkServicesHealth = async () => {
  isUpdating.value = true
  await serviceStore.checkServicesHealth()
  isUpdating.value = false
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
    <DsfrButton
      data-testid="refresh-btn"
      title="Renouveler l'appel"
      secondary
      icon-only
      icon="ri-refresh-fill"
      :disabled="!!isUpdating"
      @click="checkServicesHealth()"
    />
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
      :description="service.message"
      :type="alertTypeMapper[service.status]"
    />
  </div>
</template>
