<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import type {
  Cluster,
} from '@cpn-console/shared'
import { useZoneStore } from '@/stores/zone.js'
import { useStageStore } from '@/stores/stage.js'
import router from '@/router/index.js'
import { useClusterStore } from '@/stores/cluster.js'
import { getRandomId } from '@/utils/func.js'

const zoneStore = useZoneStore()
const stageStore = useStageStore()
const clusterStore = useClusterStore()

const tableKey = ref(getRandomId('table'))
const isLoading = ref(true)
const inputSearchText = ref('')

const clustersFiltered = computed(() => clusterStore.clusters.filter(cluster => cluster.label.includes(inputSearchText.value)))
const title = 'Liste des clusters'

function showNewClusterForm() {
  router.push({ name: 'AdminCluster', params: { id: 'create' } })
}

onMounted(async () => {
  await stageStore.getAllStages()
  await Promise.all([
    zoneStore.getAllZones(),
    clusterStore.getClusters(),
  ])
  isLoading.value = false
})

const privacyWording: Record<Cluster['privacy'], string> = {
  dedicated: 'Dédié',
  public: 'Public',
}

function clickCluster(cluster: Cluster) {
  router.push({ name: 'AdminCluster', params: { id: cluster.id } })
}
</script>

<template>
  <div
    class="flex justify-between gap-5 w-full items-end mb-5"
  >
    <div
      class="flex gap-5 w-max items-end"
    >
      <DsfrInputGroup
        v-model="inputSearchText"
        data-testid="projectsSearchInput"
        label-visible
        placeholder="Recherche textuelle"
        label="Recherche"
        class="mb-0"
      />
      <DsfrButton
        label="Ajouter un nouveau cluster"
        data-testid="addClusterLink"
        tertiary
        title="Ajouter un cluster"
        class="fr-mt-2v <md:mb-2"
        icon="ri:add-line"
        @click="showNewClusterForm()"
      />
    </div>
  </div>
  <DsfrTable
    :key="tableKey"
    data-testid="tableAdministrationClusters"
    :title="title"
  >
    <template #header>
      <tr>
        <td>Nom</td>
        <td>Zone</td>
        <td>Confidentialité</td>
      </tr>
    </template>
    <tr
      v-if="isLoading || !clustersFiltered.length"
    >
      <td colspan="7">
        {{ isLoading ? 'Chargement...' : 'Aucun cluster trouvé' }}
      </td>
    </tr>
    <tr
      v-for="cluster in clustersFiltered"
      v-else
      :key="cluster.id"
      :data-testid="`clusterTr-${cluster.label}`"
      class="cursor-pointer relative"
      :title="`Voir le tableau de bord du projet ${cluster.label}`"
      @click.stop="() => clickCluster(cluster)"
    >
      <td>{{ cluster.label }}</td>
      <td>
        <Badge
          type="zone"
          :name="zoneStore.zonesById[cluster.zoneId]?.label"
        />
      </td>
      <td
        v-if="cluster.privacy === 'dedicated'"
      >
        <v-icon name="ri:folder-shield-2-line" /> {{ privacyWording[cluster.privacy] }}
      </td>
      <td
        v-else
      >
        <v-icon name="ri:global-line" /> {{ privacyWording[cluster.privacy] }}
      </td>
    </tr>
  </DsfrTable>
</template>

<style scoped>
.fr-select-group, .fr-input-group {
  margin-bottom: 0 !important;
}
</style>
