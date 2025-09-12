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
import { DsfrDataTable } from '@gouvminint/vue-dsfr'

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

const headers = [
  {
    key: 'nom',
    label: 'Nom',
  },
  {
    key: 'zone',
    label: 'Zone',
  },
  {
    key: 'usage',
    label: 'Confidentialité',
  },
  {
    key: 'resources',
    label: 'Ressources allouables',
  },
]
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
  <Loader v-if="isLoading" />
  <span v-else-if="!clustersFiltered.length" data-testid="noClusterMsg">
    Aucun cluster trouvé
  </span>
  <DsfrDataTable
    v-else
    :key="tableKey"
    data-testid="tableAdministrationClusters"
    :title="title"
    :headers-row="headers"
    :rows="clustersFiltered"
    sortable-rows
  >
    <template #header="{ label }">
      {{ label }}
    </template>
    <template #cell="{ colKey, cell }">
      <template v-if="colKey === 'nom'">
        <a
          :href="`clusters/${(cell as Cluster).id}`"
          :title="`Éditer le cluster ${(cell as Cluster).label}`"
          @click="() => clickCluster(cell as Cluster)"
        >
          {{ (cell as Cluster).label }}
        </a>
      </template>
      <template v-else-if="colKey === 'zone'">
        <Badge
          type="zone"
          :name="zoneStore.zonesById[(cell as Cluster).zoneId]?.label"
        />
      </template>
      <template v-else-if="colKey === 'usage'">
        <v-icon v-if="(cell as Cluster).privacy === 'dedicated'" name="ri:folder-shield-2-line" />
        <v-icon v-else name="ri:global-line" />
        {{ privacyWording[(cell as Cluster).privacy] }}
      </template>
      <template v-else-if="colKey === 'resources'">
        {{ (cell as Cluster).memory }}GiB {{ (cell as Cluster).cpu }}CPU {{ (cell as Cluster).gpu }}GPU
      </template>
      <template v-else>
        {{ cell }}
      </template>
    </template>
  </DsfrDataTable>
</template>

<style scoped>
.fr-select-group, .fr-input-group {
  margin-bottom: 0 !important;
}
</style>
