<script lang="ts" setup>
import { ref } from 'vue'
import { servicePluginOrder, type PluginSchema } from '@cpn-console/shared'
import { usePluginsStore } from '@/stores/plugins.js'

const pluginsStore = usePluginsStore()

const services = ref<Omit<PluginSchema, 'manifest'>[]>([])

async function reload() {
  const res = await pluginsStore.listPlugins()
  services.value = []
  nextTick()
  services.value = res.sort((a, b) => {
    const fixedOrderA = servicePluginOrder.indexOf(a.name)
    const fixedOrderB = servicePluginOrder.indexOf(b.name)
    if (fixedOrderA >= 0 && fixedOrderB >= 0) {
      return fixedOrderA - fixedOrderB
    }
    if (fixedOrderB < 0) {
      return -1
    }
    return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
  })
}

onBeforeMount(() => {
  reload()
})
</script>

<template>
  <div
    class="flex justify-end gap-10"
  >
    <DsfrButton
      label="Recharger"
      secondary
      data-testid="reloadBtn"
      @click="reload"
    />
  </div>
  <div
    v-if="!services.length"
    id="servicesTable"
    class="p-10 flex justify-center italic"
  >
    Aucun service disponible
  </div>
  <h3
    v-else
    id="servicesTable"
  >
    Services externes
  </h3>

  <div
    data-testid="services-urls"
    class="flex flex-row flex-wrap gap-5 items-stretch justify-start gap-8 w-full mb-10"
  >
    <template
      v-for="service in services"
      :key="service.name"
    >
      <DsfrTile
        class="flex-basis-60 flex-grow max-w-50"
        :title="service.title || service.name"
        :img-src="service.imgSrc"
        :description="service.description"
        :icon="false"
        :to="`/admin/plugins/${service.name}`"
        shadow
      />
    </template>
  </div>
</template>

<style>
.fr-tile__title [target="_blank"]::after {
  display: none;
}

.fr-grid-row .fr-tile {
  height: inherit
}

.fr-tile__pictogram > img {
  width: inherit;
}
</style>
