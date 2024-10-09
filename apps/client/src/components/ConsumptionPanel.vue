<script lang="ts" setup>
import type { ProjectV2 } from '@cpn-console/shared'
import xbytes from 'xbytes'
import { computed, onBeforeMount } from 'vue'
import { useProjectStore } from '../stores/project.js'
import { type Consumption, listQuotasToConsumption } from '../utils/func.js'
import { useQuotaStore } from '../stores/quota.js'

const props = defineProps<{
  ids: ProjectV2['id'][]
}>()

const projectStore = useProjectStore()
const quotaStore = useQuotaStore()

const consumption = computed<Consumption>(() => {
  if (props.ids) {
    const projects = props.ids.map(id => projectStore.myProjectsById[id] ?? projectStore.projectsById[id])
    const quotas = projects.map(project => project.environments.map(env => quotaStore.quotasById[env.quotaId]))
      .flat()
    return listQuotasToConsumption(quotas)
  }
  return {
    cpu: 0,
    memory: 0,
  }
})
onBeforeMount(() => {
  quotaStore.getAllQuotas()
})
</script>

<template>
  <div
    id="consumption-panel"
    data-testid="consumptionPanel"
    class="grid grid-cols-1 content-between max-w-40 pl-2 p-1 place-items-end gap-2"
  >
    <DsfrBadge
      v-if="props.ids.length > 1"
      :label="`${props.ids.length} Projets`"
      no-icon
      type=""
    />
    <DsfrBadge
      v-if="consumption.cpu != null"
      :label="`${consumption.cpu} CPU`"
      no-icon
      type=""
    />
    <DsfrBadge
      v-if="consumption.memory != null"
      :label="`${xbytes(consumption.memory, { iec: true })} RAM`"
      no-icon
      type=""
    />
  </div>
</template>

<style>
.fr-callout#consumption-panel {
  margin: 0 !important;
  margin-bottom: 0 !important;
}
</style>
