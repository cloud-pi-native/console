<script  lang="ts" setup>
import { useServiceStore } from '@/stores/services.js'
import { ref, computed, onBeforeMount, type Ref } from 'vue'

const serviceStore = useServiceStore()

const isUpdating: Ref<boolean> = ref(true)
const services = computed(() => serviceStore.services)
const servicesHealth = computed(() => serviceStore.servicesHealth)

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
      :type="servicesHealth.status"
      :label="servicesHealth.message"
    />
    <DsfrButton
      data-testid="refresh-btn"
      title="Renouveler l'appel"
      secondary
      icon-only
      icon="ri-refresh-fill"
      :disabled="isUpdating === true"
      @click="checkServicesHealth()"
    />
  </div>
  <div
    class="md:grid md:grid-cols-3 md:gap-3 items-center justify-between"
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
