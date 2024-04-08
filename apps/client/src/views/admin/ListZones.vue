<script lang="ts" setup>
import { ref, onMounted, watch, computed } from 'vue'
import { sortArrByObjKeyAsc } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useAdminClusterStore } from '@/stores/admin/cluster.js'
import { useAdminZoneStore } from '@/stores/admin/zone.js'
import { useZoneStore } from '@/stores/zone.js'

const snackbarStore = useSnackbarStore()
const adminZoneStore = useAdminZoneStore()
const adminClusterStore = useAdminClusterStore()
const zoneStore = useZoneStore()

const selectedZone = ref<Record<string, never>>({})
const zoneList = ref<any[]>([])
const isNewZoneForm = ref(false)

const zones = computed(() => zoneStore.zones)
const allClusters = computed(() => adminClusterStore.clusters)
const associatedClusters = computed(() => allClusters.value?.filter(cluster => cluster.zoneId === selectedZone.value.id))

const setZoneTiles = (zones: any[]) => {
  zoneList.value = sortArrByObjKeyAsc(zones, 'name')
    ?.map(zone => ({
      id: zone.id,
      title: zone.label,
      data: zone,
    }))
}

const setSelectedZone = async (zone) => {
  if (selectedZone.value?.id === zone.id) {
    selectedZone.value = {}
    return
  }
  selectedZone.value = zone
  isNewZoneForm.value = false
}

const showNewZoneForm = () => {
  isNewZoneForm.value = !isNewZoneForm.value
  selectedZone.value = {}
}

const cancel = () => {
  isNewZoneForm.value = false
  selectedZone.value = {}
}

const createZone = async (zone) => {
  snackbarStore.isWaitingForResponse = true
  await adminZoneStore.createZone(zone)
  await zoneStore.getAllZones()
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const updateZone = async ({ zoneId, label, description, clusterIds }) => {
  snackbarStore.isWaitingForResponse = true
  await adminZoneStore.updateZone(zoneId, { label, description, clusterIds })
  await zoneStore.getAllZones()
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const deleteZone = async (zoneId) => {
  snackbarStore.isWaitingForResponse = true
  await adminZoneStore.deleteZone(zoneId)
  await zoneStore.getAllZones()
  cancel()
  snackbarStore.isWaitingForResponse = false
}

onMounted(async () => {
  await zoneStore.getAllZones()
  await adminClusterStore.getClusters()
  setZoneTiles(zones.value)
})

watch(zones, async () => {
  await adminClusterStore.getClusters()
  setZoneTiles(zones.value)
})

</script>

<template>
  <div
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      v-if="!Object.keys(selectedZone).length && !isNewZoneForm"
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
      :key="zone.slug"
      class="fr-mt-2v fr-mb-4w w-full"
    >
      <div
        v-show="!Object.keys(selectedZone).length"
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
        v-if="Object.keys(selectedZone).length && selectedZone.id === zone.id"
        :all-clusters="allClusters"
        :zone="selectedZone"
        class="w-full"
        :is-new-zone="false"
        :associated-clusters="associatedClusters"
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
