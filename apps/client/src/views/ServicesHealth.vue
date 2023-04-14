<script setup>
import { useServiceStore } from '@/stores/services.js'
import { ref, computed, onBeforeMount } from 'vue'

const serviceStore = useServiceStore()

const isUpdating = ref(true)
const services = computed(() => serviceStore.services)
const servicesHealth = computed(() => serviceStore.servicesHealth)

const checkServicesHealth = async () => {
  isUpdating.value = ref(true)
  await serviceStore.checkServicesHealth()
  isUpdating.value = ref(false)
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
      :type="servicesHealth.status"
      :label="servicesHealth.message"
    />
    <DsfrButton
      data-testid="refresh-btn"
      title="Renouveler l'appel"
      secondary
      icon-only
      icon="ri-refresh-fill"
      :disabled="isUpdating.value === true"
      @click="checkServicesHealth()"
    />
  </div>
  <div
    class="grid grid-cols-3 gap-2 items-center justify-between"
  >
    <DsfrAlert
      v-for="service in services"
      :key="service.name"
      :data-testid="`${service.name}-info`"
      :title="service.name"
      class="pb-5 fr-mt-2w"
      :description="service.message ? `${service.code} - ${service.message}` : `${service.code}`"
      :type="service.status"
    />
  </div>
</template>
