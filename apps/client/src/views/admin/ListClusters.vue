<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  sortArrByObjKeyAsc,
  type CreateClusterBody,
  type UpdateClusterBody,
  type Cluster,
  type Stage,
  type ClusterAssociatedEnvironments,
  type ProjectV2,
  type Organization,
  type ClusterDetails,
} from '@cpn-console/shared'
import { useAdminProjectStore } from '@/stores/admin/project.js'
import { useOrganizationStore } from '@/stores/organization.js'
import { useZoneStore } from '@/stores/zone.js'
import { useStageStore } from '@/stores/stage.js'
import { useClusterStore } from '@/stores/cluster'

type ClusterList = {
  id: Cluster['id']
  title: Cluster['label']
  data: Cluster
}[]

const clusterStore = useClusterStore()
const adminProjectStore = useAdminProjectStore()
const organizationStore = useOrganizationStore()
const zoneStore = useZoneStore()
const stageStore = useStageStore()

const clusters = computed(() => clusterStore.clusters)
const allZones = computed(() => zoneStore.zones)
const clusterList = ref<ClusterList>([])
const allProjects = ref<(ProjectV2 & { organization: Organization})[]>([])
const allStages = ref<Stage[]>([])
const isUpdatingCluster = ref(false)
const isNewClusterForm = ref(false)
const associatedEnvironments = ref<ClusterAssociatedEnvironments>([])

const setClusterTiles = (clusterArr: typeof clusters.value) => {
  clusterList.value = sortArrByObjKeyAsc(clusterArr, 'label')
    .map(cluster => ({
      id: cluster.id,
      title: cluster.label,
      data: cluster,
    }))
}

const setSelectedCluster = async (id: Cluster['id']) => {
  if (clusterStore.selectedCluster?.id === id) {
    clusterStore.selectedCluster = undefined
    return
  }
  await Promise.all([
    clusterStore.getClusterDetails(id),
    getClusterAssociatedEnvironments(id),
  ])
  isNewClusterForm.value = false
}

const getClusterAssociatedEnvironments = async (clusterId: string) => {
  isUpdatingCluster.value = true
  associatedEnvironments.value = await clusterStore.getClusterAssociatedEnvironments(clusterId) ?? []
  isUpdatingCluster.value = false
}

const showNewClusterForm = () => {
  isNewClusterForm.value = !isNewClusterForm.value
  clusterStore.selectedCluster = undefined
}

const cancel = () => {
  isNewClusterForm.value = false
  clusterStore.selectedCluster = undefined
}

const addCluster = async (cluster: CreateClusterBody) => {
  isUpdatingCluster.value = true
  cancel()
  await clusterStore.addCluster(cluster)
  await clusterStore.getClusters()
  isUpdatingCluster.value = false
}

const updateCluster = async (cluster: UpdateClusterBody & { id: Cluster['id'] }) => {
  isUpdatingCluster.value = true
  await clusterStore.updateCluster(cluster)
  await clusterStore.getClusters()
  cancel()
  isUpdatingCluster.value = false
}

const deleteCluster = async (clusterId: Cluster['id']) => {
  isUpdatingCluster.value = true
  await clusterStore.deleteCluster(clusterId)
  await clusterStore.getClusters()
  setClusterTiles(clusters.value)
  clusterStore.selectedCluster = undefined
  isUpdatingCluster.value = false
}

onMounted(async () => {
  await clusterStore.getClusters()
  setClusterTiles(clusters.value)
  const [projects] = await Promise.all([
    adminProjectStore.getAllProjects({ filter: 'all' }),
    zoneStore.getAllZones(),
    organizationStore.listOrganizations(),
  ])
  allProjects.value = projects.map(project => ({
    ...project,
    organization: organizationStore.organizationsById[project.organizationId] as Organization,
  }))
  allStages.value = await stageStore.getAllStages()
})

watch(clusters, () => {
  setClusterTiles(clusters.value)
})

</script>

<template>
  <div
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      v-if="!clusterStore.selectedCluster && !isNewClusterForm"
      label="Ajouter un nouveau cluster"
      data-testid="addClusterLink"
      tertiary
      title="Ajouter un cluster"
      class="fr-mt-2v <md:mb-2"
      icon="ri-add-line"
      @click="showNewClusterForm()"
    />
    <div
      v-else
      class="w-full flex justify-end"
    >
      <DsfrButton
        title="Revenir à la liste des clusters"
        data-testid="goBackBtn"
        secondary
        icon-only
        icon="ri-arrow-go-back-line"
        @click="() => cancel()"
      />
    </div>
  </div>
  <div
    v-if="isNewClusterForm"
    class="my-5 pb-10 border-grey-900 border-y-1"
  >
    <ClusterForm
      :all-zones="allZones"
      :all-projects="allProjects"
      :all-stages="allStages"
      class="w-full"
      is-updating-cluster="isUpdatingCluster"
      @add="(cluster: Omit<ClusterDetails, 'id'>) => addCluster(cluster)"
      @cancel="cancel()"
    />
  </div>
  <div
    v-else
    :class="{
      'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !clusterStore.selectedCluster?.label,
    }"
  >
    <div
      v-for="cluster in clusterList"
      :key="cluster.id"
      class="fr-mt-2v fr-mb-4w w-full"
    >
      <div
        v-show="!clusterStore.selectedCluster"
      >
        <DsfrTile
          :title="cluster.title"
          :data-testid="`clusterTile-${cluster.title}`"
          :horizontal="!!clusterStore.selectedCluster?.label"
          class="fr-mb-2w w-11/12"
          @click="setSelectedCluster(cluster.id)"
        />
      </div>
      <ClusterForm
        v-if="clusterStore.selectedCluster && clusterStore.selectedCluster.id === cluster.id"
        :cluster="clusterStore.selectedCluster"
        :all-zones="allZones"
        :all-projects="allProjects"
        :all-stages="allStages"
        :associated-environments="associatedEnvironments"
        is-updating-cluster="isUpdatingCluster"
        class="w-full"
        :is-new-cluster="false"
        @update="(clusterUpdate: Partial<ClusterDetails>) => updateCluster({
          ...clusterUpdate,
          id: cluster.id,
        })"
        @delete="(clusterId: string) => deleteCluster(clusterId)"
        @cancel="cancel()"
      />
    </div>
    <div
      v-if="!clusterList.length && !isNewClusterForm"
    >
      <p>Aucun cluster enregistré</p>
    </div>
  </div>
</template>
