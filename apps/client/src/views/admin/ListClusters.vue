<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { sortArrByObjKeyAsc, type CreateClusterBody, type UpdateClusterBody, type Cluster, type Stage, type Project, type ClusterAssociatedEnvironments } from '@cpn-console/shared'
import { useAdminClusterStore } from '@/stores/admin/cluster.js'
import { useAdminProjectStore } from '@/stores/admin/project.js'
import { useAdminOrganizationStore } from '@/stores/admin/organization.js'
import { useZoneStore } from '@/stores/zone.js'
import { useStageStore } from '@/stores/stage.js'
import { useClusterStore } from '@/stores/cluster'

type ClusterList = {
  id: Cluster['id']
  title: Cluster['label']
  data: Cluster
}[]

const adminClusterStore = useAdminClusterStore()
const clusterStore = useClusterStore()
const adminProjectStore = useAdminProjectStore()
const adminOrganizationStore = useAdminOrganizationStore()
const zoneStore = useZoneStore()
const stageStore = useStageStore()

const clusters = computed(() => clusterStore.clusters)
const allZones = computed(() => zoneStore.zones)
const clusterList = ref<ClusterList>([])
const allProjects = ref<Project[]>([])
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
  if (adminClusterStore.selectedCluster?.id === id) {
    adminClusterStore.selectedCluster = undefined
    return
  }
  await Promise.all([
    adminClusterStore.getClusterDetails(id),
    getClusterAssociatedEnvironments(id),
  ])
  isNewClusterForm.value = false
}

const getClusterAssociatedEnvironments = async (clusterId: string) => {
  isUpdatingCluster.value = true
  associatedEnvironments.value = await adminClusterStore.getClusterAssociatedEnvironments(clusterId) ?? []
  isUpdatingCluster.value = false
}

const showNewClusterForm = () => {
  isNewClusterForm.value = !isNewClusterForm.value
  adminClusterStore.selectedCluster = undefined
}

const cancel = () => {
  isNewClusterForm.value = false
  adminClusterStore.selectedCluster = undefined
}

const addCluster = async (cluster: CreateClusterBody) => {
  isUpdatingCluster.value = true
  cancel()
  await adminClusterStore.addCluster(cluster)
  await clusterStore.getClusters()
  isUpdatingCluster.value = false
}

const updateCluster = async (cluster: UpdateClusterBody & { id: Cluster['id'] }) => {
  isUpdatingCluster.value = true
  await adminClusterStore.updateCluster(cluster)
  await clusterStore.getClusters()
  cancel()
  isUpdatingCluster.value = false
}

const deleteCluster = async (clusterId: Cluster['id']) => {
  isUpdatingCluster.value = true
  await adminClusterStore.deleteCluster(clusterId)
  await clusterStore.getClusters()
  setClusterTiles(clusters.value)
  adminClusterStore.selectedCluster = undefined
  isUpdatingCluster.value = false
}

onMounted(async () => {
  await clusterStore.getClusters()
  setClusterTiles(clusters.value)
  await zoneStore.getAllZones()
  allProjects.value = await adminProjectStore.getAllActiveProjects()
  const organizations = await adminOrganizationStore.getAllOrganizations()
  allProjects.value.forEach(project => { project.organization = organizations.find(org => org.id === project.organizationId) })
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
      v-if="!adminClusterStore.selectedCluster && !isNewClusterForm"
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
      @add="(cluster) => addCluster(cluster)"
      @update="(cluster) => updateCluster(cluster)"
      @cancel="cancel()"
    />
  </div>
  <div
    v-else
    :class="{
      'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !adminClusterStore.selectedCluster?.label,
    }"
  >
    <div
      v-for="cluster in clusterList"
      :key="cluster.id"
      class="fr-mt-2v fr-mb-4w w-full"
    >
      <div
        v-show="!adminClusterStore.selectedCluster"
      >
        <DsfrTile
          :title="cluster.title"
          :data-testid="`clusterTile-${cluster.title}`"
          :horizontal="!!adminClusterStore.selectedCluster?.label"
          class="fr-mb-2w w-11/12"
          @click="setSelectedCluster(cluster.id)"
        />
      </div>
      <ClusterForm
        v-if="adminClusterStore.selectedCluster && adminClusterStore.selectedCluster.id === cluster.id"
        :cluster="adminClusterStore.selectedCluster"
        :all-zones="allZones"
        :all-projects="allProjects"
        :all-stages="allStages"
        :associated-environments="associatedEnvironments"
        is-updating-cluster="isUpdatingCluster"
        class="w-full"
        :is-new-cluster="false"
        @update="(cluster) => updateCluster(cluster)"
        @delete="(clusterId) => deleteCluster(clusterId)"
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
