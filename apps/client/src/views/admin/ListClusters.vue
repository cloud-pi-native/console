<script lang="ts" setup>
import { ref, computed, onMounted, watch, type Ref } from 'vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useAdminClusterStore } from '@/stores/admin/cluster.js'
import { useAdminProjectStore } from '@/stores/admin/project.js'
import ClusterForm from '@/components/ClusterForm.vue'
import { sortArrByObjKeyAsc, type CreateClusterDto, type UpdateClusterDto, type ClusterParams } from '@dso-console/shared'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import { handleError } from '@/utils/func.js'

const adminClusterStore = useAdminClusterStore()
const adminProjectStore = useAdminProjectStore()
const projectEnvironmentStore = useProjectEnvironmentStore()
const snackbarStore = useSnackbarStore()

const clusters = computed(() => adminClusterStore.clusters)
const selectedCluster = ref({})
const clusterList = ref([])
const allProjects: Ref<any[]> = ref([])
const allStages: Ref<any[]> = ref([])
const isUpdatingCluster = ref(false)
const isNewClusterForm = ref(false)
const associatedEnvironments: Ref<any[]> = ref([])

const setClusterTiles = (clusters) => {
  clusterList.value = sortArrByObjKeyAsc(clusters, 'label')
    ?.map(cluster => ({
      id: cluster.id,
      title: cluster.label,
      data: cluster,
    }))
}

const setSelectedCluster = async (cluster) => {
  if (selectedCluster.value?.label === cluster.label) {
    selectedCluster.value = {}
    return
  }
  selectedCluster.value = cluster
  isNewClusterForm.value = false
  await getClusterAssociatedEnvironments(cluster.id)
}

const getClusterAssociatedEnvironments = async (clusterId: string) => {
  isUpdatingCluster.value = true
  try {
    associatedEnvironments.value = await adminClusterStore.getClusterAssociatedEnvironments(clusterId)
  } catch (error) {
    handleError(error)
  }
  isUpdatingCluster.value = false
}

const showNewClusterForm = () => {
  isNewClusterForm.value = !isNewClusterForm.value
  selectedCluster.value = {}
}

const cancel = () => {
  isNewClusterForm.value = false
  selectedCluster.value = {}
}

const addCluster = async (cluster: CreateClusterDto) => {
  isUpdatingCluster.value = true
  cancel()
  try {
    await adminClusterStore.addCluster(cluster)
    await adminClusterStore.getClusters()
  } catch (error) {
    handleError(error)
  }
  isUpdatingCluster.value = false
}

const updateCluster = async (cluster: UpdateClusterDto & { id: ClusterParams['clusterId'] }) => {
  isUpdatingCluster.value = true
  try {
    await adminClusterStore.updateCluster(cluster)
    await adminClusterStore.getClusters()
  } catch (error) {
    handleError(error)
  }
  cancel()
  isUpdatingCluster.value = false
}

const deleteCluster = async (clusterId: ClusterParams['clusterId']) => {
  isUpdatingCluster.value = true
  try {
    await adminClusterStore.deleteCluster(clusterId)
    await adminClusterStore.getClusters()
  } catch (error) {
    handleError(error)
  }
  setClusterTiles(clusters.value)
  selectedCluster.value = {}
  isUpdatingCluster.value = false
}

onMounted(async () => {
  try {
    await adminClusterStore.getClusters()
    setClusterTiles(clusters.value)
    allProjects.value = await adminProjectStore.getAllActiveProjects()
    allStages.value = await projectEnvironmentStore.getStages()
  } catch (error) {
    handleError(error)
  }
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
      label="Ajouter un nouveau cluster"
      data-testid="addClusterLink"
      tertiary
      title="Ajouter un cluster"
      class="fr-mt-2v <md:mb-2"
      icon="ri-add-line"
      @click="showNewClusterForm()"
    />
  </div>
  <div
    v-if="isNewClusterForm"
    class="my-5 pb-10 border-grey-900 border-y-1"
  >
    <ClusterForm
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
    :class="{
      'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !selectedCluster?.label,
    }"
  >
    <div
      v-for="cluster in clusterList"
      :key="cluster.id"
      class="fr-mt-2v fr-mb-4w w-full"
    >
      <div>
        <DsfrTile
          :title="cluster.title"
          :data-testid="`clusterTile-${cluster.title}`"
          :horizontal="!!selectedCluster?.label"
          class="fr-mb-2w w-11/12"
          @click="setSelectedCluster(cluster.data)"
        />
      </div>
      <ClusterForm
        v-if="Object.keys(selectedCluster).length && selectedCluster.id === cluster.id"
        :cluster="selectedCluster"
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
