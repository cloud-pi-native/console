<script lang="ts" setup>
import { ref, onMounted, watch, computed } from 'vue'
import { type Zone, sortArrByObjKeyAsc, type CreateZoneBody, type UpdateZoneBody } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useAdminZoneStore } from '@/stores/admin/zone.js'
import { useZoneStore } from '@/stores/zone.js'
import { useClusterStore } from '@/stores/cluster'

const snackbarStore = useSnackbarStore()
const adminZoneStore = useAdminZoneStore()
const clusterStore = useClusterStore()
const zoneStore = useZoneStore()

const selectedZone = ref<Zone>()
const zoneList = ref<{
  id: string
  title: string
  data: Zone,
}[]>([])
const isNewZoneForm = ref(false)

const zones = computed(() => zoneStore.zones)
const allClusters = computed(() => clusterStore.clusters)
const associatedClusters = computed(() => allClusters.value.filter(cluster => cluster.zoneId === selectedZone.value?.id))

const setZoneTiles = (zones: Zone[]) => {
  zoneList.value = sortArrByObjKeyAsc(zones, 'name')
    .map(zone => ({
      id: zone.id,
      title: zone.label,
      data: zone,
    }))
}

const setSelectedZone = async (zone: Zone) => {
  if (selectedZone.value?.id === zone.id) {
    selectedZone.value = undefined
    return
  }
  selectedZone.value = zone
  isNewZoneForm.value = false
}

const showNewZoneForm = () => {
  isNewZoneForm.value = !isNewZoneForm.value
  selectedZone.value = undefined
}

const cancel = () => {
  isNewZoneForm.value = false
  selectedZone.value = undefined
}

const createZone = async (zone: CreateZoneBody) => {
  snackbarStore.isWaitingForResponse = true
  await adminZoneStore.createZone(zone)
  await Promise.all([
    zoneStore.getAllZones(),
    clusterStore.getClusters(),
  ])
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const updateZone = async ({ zoneId, label, description }: UpdateZoneBody & { zoneId: Zone['id'] }) => {
  snackbarStore.isWaitingForResponse = true
  await adminZoneStore.updateZone(zoneId, { label, description })
  await Promise.all([
    zoneStore.getAllZones(),
    clusterStore.getClusters(),
  ])
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const deleteZone = async (zoneId: Zone['id']) => {
  snackbarStore.isWaitingForResponse = true
  await adminZoneStore.deleteZone(zoneId)
  await Promise.all([
    zoneStore.getAllZones(),
    clusterStore.getClusters(),
  ])
  cancel()
  snackbarStore.isWaitingForResponse = false
}

onMounted(async () => {
  await Promise.all([
    zoneStore.getAllZones(),
    clusterStore.getClusters(),
  ])
  setZoneTiles(zones.value)
})

watch(zones, async () => {
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
      icon="ri-add-line"
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
        icon="ri-arrow-go-back-line"
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
      class="w-full"
      :is-new-zone="true"
      @add="(zone) => createZone(zone)"
      @cancel="cancel()"
    />
  </div>
  <div
    v-else
    :class="{
      'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !selectedZone?.id,
    }"
  >
    <div
      v-for="zone in zoneList"
      :key="zone.data.slug"
      class="fr-mt-2v fr-mb-4w w-full"
    >
      <div
        v-show="!selectedZone"
      >
        <DsfrTile
          :title="zone.title"
          :data-testid="`zoneTile-${zone.title}`"
          :horizontal="!!selectedZone?.id"
          class="fr-mb-2w w-11/12"
          @click="setSelectedZone(zone.data)"
        />
      </div>
      <ZoneForm
        v-if="selectedZone && selectedZone.id === zone.id"
        :all-clusters="allClusters"
        :zone="selectedZone"
        :associated-clusters="associatedClusters"
        :is-new-zone="false"
        class="w-full"
        @cancel="cancel()"
        @update="(zone) => updateZone(zone)"
        @delete="(zoneId) => deleteZone(zoneId)"
      />
    </div>
    <div
      v-if="!zoneList.length && !isNewZoneForm"
    >
      <p>Aucune zone enregistrée</p>
    </div>
  </div>
</template>
