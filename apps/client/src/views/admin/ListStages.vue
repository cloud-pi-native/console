<script lang="ts" setup>
import { ref, computed, onMounted, watch, type Ref } from 'vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useAdminStageStore } from '@/stores/admin/stage.js'
import StageForm from '@/components/StageForm.vue'
import { sortArrByObjKeyAsc } from '@dso-console/shared'
import type { CreateStageDto, UpdateQuotaStageDto, DeleteStageDto, StageModel, UpdateStageClustersDto } from '@dso-console/shared'
import { useAdminQuotaStore } from '@/stores/admin/quota'
import { useAdminClusterStore } from '@/stores/admin/cluster'

const adminStageStore = useAdminStageStore()
const adminQuotaStore = useAdminQuotaStore()
const adminClusterStore = useAdminClusterStore()
const snackbarStore = useSnackbarStore()

const selectedStage: Ref<StageModel | Record<string, never>> = ref({})
const stageList: Ref<any[]> = ref([])
const associatedEnvironments: Ref<any[]> = ref([])
const isWaitingForResponse = ref(false)
const isNewStageForm = ref(false)

const stages = computed(() => adminStageStore.stages)
const allQuotas = computed(() => adminQuotaStore.quotas)
const allClusters = computed(() => adminClusterStore.clusters)

const setStageTiles = (stages: StageModel[]) => {
  stageList.value = sortArrByObjKeyAsc(stages, 'name')
    ?.map(stage => ({
      id: stage.id,
      title: stage.name,
      data: stage,
    }))
}

const setSelectedStage = async (stage: StageModel) => {
  if (selectedStage.value?.name === stage.name) {
    selectedStage.value = {}
    return
  }
  selectedStage.value = stage
  isNewStageForm.value = false
  // @ts-ignore
  await getStageAssociatedEnvironments(stage.id)
}

const showNewStageForm = () => {
  isNewStageForm.value = !isNewStageForm.value
  selectedStage.value = {}
}

const cancel = () => {
  isNewStageForm.value = false
  selectedStage.value = {}
}

const addStage = async (stage: CreateStageDto['body']) => {
  isWaitingForResponse.value = true
  cancel()
  try {
    await adminStageStore.addStage(stage)
    await adminStageStore.getAllStages()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

export type UpdateStageType = {
  stageId: UpdateQuotaStageDto['body']['stageId'],
  quotaIds?: UpdateQuotaStageDto['body']['quotaIds']
  clusterIds?: UpdateStageClustersDto['body']['clusterIds']
}

const updateStage = async ({ stageId, quotaIds, clusterIds }: UpdateStageType) => {
  isWaitingForResponse.value = true
  try {
    await adminStageStore.updateQuotaStage(stageId, quotaIds)
    await adminStageStore.updateStageClusters(stageId, clusterIds)
    await adminStageStore.getAllStages()
    cancel()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

const deleteStage = async (stageId: DeleteStageDto['params']['stageId']) => {
  isWaitingForResponse.value = true
  cancel()
  try {
    await adminStageStore.deleteStage(stageId)
    await adminStageStore.getAllStages()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

const getStageAssociatedEnvironments = async (stageId: DeleteStageDto['params']['stageId']) => {
  isWaitingForResponse.value = true
  try {
    associatedEnvironments.value = await adminStageStore.getStageAssociatedEnvironments(stageId)
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

onMounted(async () => {
  try {
    await adminQuotaStore.getAllQuotas()
    await adminClusterStore.getClusters()
    await adminStageStore.getAllStages()
    setStageTiles(stages.value)
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
})

watch(stages, () => {
  setStageTiles(stages.value)
})

</script>

<template>
  <div
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      label="Ajouter un nouveau stage"
      data-testid="addStageLink"
      tertiary
      title="Ajouter un stage"
      class="fr-mt-2v <md:mb-2"
      icon="ri-add-line"
      @click="showNewStageForm()"
    />
  </div>
  <div
    v-if="isNewStageForm"
    class="my-5 pb-10 border-grey-900 border-y-1"
  >
    <StageForm
      :all-quotas="allQuotas"
      :all-clusters="allClusters"
      class="w-full"
      :is-new-stage="true"
      :is-updating-stage="isWaitingForResponse"
      @add="(stage: CreateStageDto['body']) => addStage(stage)"
      @cancel="cancel()"
    />
  </div>
  <div
    :class="{
      'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !selectedStage?.name,
    }"
  >
    <div
      v-for="stage in stageList"
      :key="stage.id"
      class="fr-mt-2v fr-mb-4w w-full"
    >
      <div>
        <DsfrTile
          :title="stage.title"
          :data-testid="`stageTile-${stage.title}`"
          :horizontal="!!selectedStage?.name"
          class="fr-mb-2w w-11/12"
          @click="setSelectedStage(stage.data)"
        />
      </div>
      <StageForm
        v-if="Object.keys(selectedStage).length && selectedStage.id === stage.id"
        :all-quotas="allQuotas"
        :all-clusters="allClusters"
        :stage="selectedStage"
        :is-updating-stage="isWaitingForResponse"
        class="w-full"
        :is-new-stage="false"
        :associated-environments="associatedEnvironments"
        @cancel="cancel()"
        @update="(stage: UpdateStageType) => updateStage(stage)"
        @delete="(stageId: DeleteStageDto['params']['stageId']) => deleteStage(stageId)"
      />
    </div>
    <div
      v-if="!stageList.length && !isNewStageForm"
    >
      <p>Aucun stage enregistré</p>
    </div>
  </div>
</template>
