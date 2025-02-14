<script setup lang="ts">
import { useClusterStore } from '@/stores/cluster.js'
import { useZoneStore } from '@/stores/zone.js'
import type { Project } from '@/utils/project-utils.js'
import { privacyWording, type Cluster } from '@cpn-console/shared'

const props = defineProps<{
  project: Project
}>()

const clusterStore = useClusterStore()
const zoneStore = useZoneStore()
const clusters = ref<Cluster[]>([])
const publicClusters = computed(() => clusters.value.filter(cluster => cluster.privacy === 'public'))
const dedicatedClusters = computed(() => clusters.value.filter(cluster => props.project.clusterIds.includes(cluster.id)))
onMounted(async () => {
  clusters.value = await clusterStore.getClusters()
  await zoneStore.getAllZones()
})
</script>

<template>
  <h3>Listes des clusters disponibles</h3>
  <div
    class="flex flex-wrap gap-10"
  >
    <div
      v-for="cluster in dedicatedClusters.concat(publicClusters)"
      :key="cluster.id"
      class="cluster-panel flex flex-col gap-2"
    >
      <h3>{{ cluster.label }}</h3>
      <div
        title="Zone"
      >
        <v-icon name="ri:focus-3-line" />: {{ zoneStore.zonesById[cluster.zoneId].label }}
      </div>
      <div
        title="Confidentialité"
      >
        Confidentialité : {{ privacyWording[cluster.privacy].text }}<v-icon :name="privacyWording[cluster.privacy].icon" />
      </div>
      <div v-if="cluster.infos">
        <hr class="pt-2 pb-0">
        <h6>Informations</h6>
        <pre
          v-if="cluster.infos"
          class="text-sm fr-text-default--info text-balance"
          copyable
        >{{ cluster.infos }}</pre>
      </div>
    </div>
  </div>
</template>

<style lang="css" scoped>
.cluster-panel{
  padding: 2rem 2rem 2.25rem;
  background-color: var(--background-raised-grey);
  filter: drop-shadow(var(--raised-shadow));
  max-width: 30rem;
}
</style>
