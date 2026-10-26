<script lang="ts" setup>
import type { CreateZoneBody, UpdateZoneBody, Zone } from '@cpn-console/shared'
import { sortArrByObjKeyAsc } from '@cpn-console/shared'
import { computed, onMounted, ref, watch } from 'vue'
import { useAsyncAction } from '@/composables/useAsyncAction.js'
import { useClusterStore } from '@/stores/cluster'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useZoneStore } from '@/stores/zone.js'
import { collectionViewState } from '@/utils/list-state.js'

const snackbarStore = useSnackbarStore()
const clusterStore = useClusterStore()
const zoneStore = useZoneStore()

const selectedZone = ref<Zone>()
const zoneList = ref<{
  id: string
  title: string
  data: Zone
}[]>([])
const isNewZoneForm = ref(false)

const zones = computed(() => zoneStore.zones)
const allClusters = computed(() => clusterStore.clusters)
const associatedClusters = computed(() => allClusters.value.filter(cluster => cluster.zoneId === selectedZone.value?.id))

const {
  pending,
  error: loadError,
  run: loadZones,
} = useAsyncAction(async () => {
  await Promise.all([
    zoneStore.getAllZones(),
    clusterStore.getClusters(),
  ])
})

const viewState = computed(() => collectionViewState({
  loading: pending.value,
  error: loadError.value,
  count: zoneList.value.length,
}))

function setZoneTiles(zones: Zone[]) {
  zoneList.value = sortArrByObjKeyAsc(zones, 'name')
    .map(zone => ({
      id: zone.id,
      title: zone.label,
      data: zone,
    }))
}

function setSelectedZone(zone: Zone) {
  if (selectedZone.value?.id === zone.id) {
    selectedZone.value = undefined
    return
  }
  selectedZone.value = zone
  isNewZoneForm.value = false
}

function showNewZoneForm() {
  isNewZoneForm.value = !isNewZoneForm.value
  selectedZone.value = undefined
}

function cancel() {
  isNewZoneForm.value = false
  selectedZone.value = undefined
}

async function createZone(zone: CreateZoneBody) {
  snackbarStore.isWaitingForResponse = true
  await zoneStore.createZone(zone)
  await Promise.all([
    zoneStore.getAllZones(),
    clusterStore.getClusters(),
  ])
  cancel()
  snackbarStore.isWaitingForResponse = false
}

async function updateZone({ zoneId, label, argocdUrl, description }: UpdateZoneBody & { zoneId: Zone['id'] }) {
  snackbarStore.isWaitingForResponse = true
  await zoneStore.updateZone(zoneId, { label, argocdUrl, description })
  await Promise.all([
    zoneStore.getAllZones(),
    clusterStore.getClusters(),
  ])
  cancel()
  snackbarStore.isWaitingForResponse = false
}

async function deleteZone(zoneId: Zone['id']) {
  snackbarStore.isWaitingForResponse = true
  await zoneStore.deleteZone(zoneId)
  await Promise.all([
    zoneStore.getAllZones(),
    clusterStore.getClusters(),
  ])
  cancel()
  snackbarStore.isWaitingForResponse = false
}

onMounted(() => {
  loadZones()
})

watch(zones, () => {
  setZoneTiles(zones.value)
})
</script>

<template>
  <div
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      v-if="!selectedZone && !isNewZoneForm"
      label="Ajouter une nouvelle zone"
      data-testid="createZoneLink"
      tertiary
      title="Ajouter une zone"
      class="fr-mt-2v <md:mb-2"
      icon="ri:add-line"
      @click="showNewZoneForm()"
    />
    <div
      v-else
      class="w-full flex justify-end"
    >
      <DsfrButton
        title="Revenir à la liste des zones"
        data-testid="goBackBtn"
        secondary
        icon-only
        icon="ri:arrow-go-back-line"
        @click="() => cancel()"
      />
    </div>
  </div>
  <div
    v-if="isNewZoneForm"
    class="my-5 pb-10 border-grey-900 border-y-1"
  >
    <ZoneForm
      :all-clusters="allClusters"
      :associated-clusters="[]"
      class="w-full"
      :is-new-zone="true"
      @add="(zone: any) => createZone(zone)"
      @cancel="cancel()"
    />
  </div>
  <ZoneForm
    v-else-if="selectedZone"
    :all-clusters="allClusters"
    :zone="selectedZone"
    :associated-clusters="associatedClusters"
    :is-new-zone="false"
    class="w-full"
    @cancel="cancel()"
    @update="(zone: any) => updateZone(zone)"
    @delete="(zoneId: any) => deleteZone(zoneId)"
  />
  <Loader v-else-if="viewState === 'loading'" />
  <div
    v-else-if="viewState === 'error' && loadError"
    class="fr-mb-2w"
  >
    <DsfrAlert
      data-testid="zonesLoadError"
      type="error"
      title="Impossible de charger les zones"
      :description="`${loadError.message} Réessayez dans quelques instants.`"
    />
    <DsfrButton
      class="fr-mt-2w"
      label="Réessayer"
      data-testid="listRetry"
      secondary
      icon="ri:refresh-line"
      @click="loadZones()"
    />
  </div>
  <div
    v-else-if="zoneList.length"
    class="flex flex-row flex-wrap gap-5 items-stretch justify-start gap-8 w-full"
  >
    <div
      v-for="zone in zoneList"
      :id="`zoneTile-${zone.data.slug}`"
      :key="zone.data.slug"
      class="flex-basis-60 flex-stretch max-w-90"
    >
      <DsfrTile
        :title="zone.title"
        :data-testid="`zoneTile-${zone.title}`"
        @click="setSelectedZone(zone.data)"
      />
    </div>
  </div>
  <div
    v-else
    data-testid="zonesEmptyState"
  >
    <p>Aucune zone enregistrée</p>
  </div>
</template>
