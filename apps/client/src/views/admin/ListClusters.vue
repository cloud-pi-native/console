<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useAdminClusterStore } from '@/stores/admin/cluster.js'
import { useAdminProjectStore } from '@/stores/admin/project.js'
import ClusterForm from '@/components/ClusterForm.vue'

const adminClusterStore = useAdminClusterStore()
const adminProjectStore = useAdminProjectStore()
const snackbarStore = useSnackbarStore()

const clusters = computed(() => adminClusterStore?.clusters)
const selectedCluster = ref({})
const clusterList = ref([])
const allProjects = ref([])

const isNewClusterForm = ref(false)

const setClusterTiles = (clusters) => {
  clusterList.value = clusters
    ?.sort((a, b) => (a.name >= b.name ? 1 : -1))
    ?.map(cluster => ({
      id: cluster.id,
      title: cluster.label,
      data: cluster,
    }))
}

const setSelectedCluster = (cluster) => {
  if (selectedCluster.value?.label === cluster.label) {
    selectedCluster.value = {}
    return
  }
  selectedCluster.value = cluster
  isNewClusterForm.value = false
}

const showNewClusterForm = () => {
  isNewClusterForm.value = !isNewClusterForm.value
  selectedCluster.value = {}
}

const cancel = () => {
  isNewClusterForm.value = false
  selectedCluster.value = {}
}

const addCluster = async (cluster) => {
  cancel()
  try {
    await adminClusterStore.addCluster(cluster)
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

const updateCluster = async (cluster) => {
  cancel()
  try {
    await adminClusterStore.updateCluster(cluster)
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

const removeCluster = async (clusterId) => {
  try {
    await adminClusterStore.removeCluster(clusterId)
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
  setClusterTiles(clusters.value)
  selectedCluster.value = {}
}

const getAllProjects = async () => {
  try {
    allProjects.value = await adminProjectStore.getAllProjects()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

onMounted(() => {
  adminClusterStore.getAllClusters()
  setClusterTiles(clusters.value)
  getAllProjects()
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
      class="w-full"
      @add="(cluster) => addCluster(cluster)"
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
          :data-testid="`clusterTile-${cluster.id}`"
          :horizontal="!!selectedCluster?.label"
          class="fr-mb-2w w-11/12"
          @click="setSelectedCluster(cluster.data)"
        />
      </div>
      <ClusterForm
        v-if="Object.keys(selectedCluster).length && selectedCluster.id === cluster.id"
        :cluster="selectedCluster"
        :all-projects="allProjects"
        class="w-full"
        :is-new-cluster="false"
        @update="(cluster) => updateCluster(cluster)"
        @delete="(clusterId) => removeCluster(clusterId)"
        @cancel="cancel()"
      />
    </div>
  </div>
</template>
