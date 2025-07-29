<script setup lang="ts">
import router from '@/router/index'
import { useClusterStore } from '@/stores/cluster'
import { useProjectStore } from '@/stores/project'
import { useStageStore } from '@/stores/stage'
import { useZoneStore } from '@/stores/zone'
import type { Project } from '@/utils/project-utils'
import type { Cluster, ClusterAssociatedEnvironments, ClusterDetails, CreateClusterBody, UpdateClusterBody } from '@cpn-console/shared'

const props = defineProps<{
  id: Cluster['id'] | 'create'
}>()

const zoneStore = useZoneStore()
const stageStore = useStageStore()
const projectStore = useProjectStore()

const associatedEnvironments = ref<ClusterAssociatedEnvironments>([])

const isLoading = ref(true)
const clusterStore = useClusterStore()
const cluster = ref<ClusterDetails>()
const allZones = computed(() => zoneStore.zones)
const allStages = computed(() => stageStore.stages)
const allProjects = ref<Project[]>([])

onBeforeMount(async () => {
  if (!stageStore.stages.length) {
    await stageStore.getAllStages()
  }
  if (!zoneStore.zones.length) {
    await zoneStore.getAllZones()
  }
  allProjects.value = await projectStore.listProjects({ statusNotIn: 'archived', filter: 'all' })
})

onMounted(async () => {
  if (props.id !== 'create') {
    associatedEnvironments.value = await clusterStore.getClusterAssociatedEnvironments(props.id)
    cluster.value = await clusterStore.getClusterDetails(props.id)
  }
  isLoading.value = false
})

function goBack() {
  router.push({ name: 'ListClusters' })
}

async function addCluster(cluster: CreateClusterBody) {
  goBack()
  await clusterStore.addCluster(cluster)
  await clusterStore.getClusters()
}

async function updateCluster(cluster: UpdateClusterBody) {
  goBack()
  await clusterStore.updateCluster({
    ...cluster,
    id: props.id,
  })
  await clusterStore.getClusters()
}

async function deleteCluster(clusterId: Cluster['id']) {
  goBack()
  await clusterStore.deleteCluster(clusterId)
  await clusterStore.getClusters()
}
</script>

<template>
  <template
    v-if="!isLoading"
  >
    <ClusterForm
      v-if="cluster"
      :is-new-cluster="false"
      :cluster="cluster"
      :all-projects="allProjects"
      :all-stages="allStages"
      :all-zones="allZones"
      :associated-environments="associatedEnvironments"
      @update="(clusterUpdate: Partial<ClusterDetails>) => updateCluster(clusterUpdate)"
      @delete="(clusterId: string) => deleteCluster(clusterId)"
      @cancel="goBack"
    />
    <ClusterForm
      v-else
      is-new-cluster
      :all-projects="allProjects"
      :all-stages="allStages"
      :all-zones="allZones"
      :associated-environments="[]"
      @add="(cluster: Omit<ClusterDetails, 'id'>) => addCluster(cluster)"
      @cancel="goBack"
    />
  </template>
</template>
