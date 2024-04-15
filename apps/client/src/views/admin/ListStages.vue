<script lang="ts" setup>
import { ref, computed, onMounted, watch, type Ref } from 'vue'
import { useAdminStageStore } from '@/stores/admin/stage.js'
import { sortArrByObjKeyAsc } from '@cpn-console/shared'
import type { CreateStageBody, UpdateQuotaStageBody, Stage, UpdateStageClustersBody } from '@cpn-console/shared'
import { useAdminQuotaStore } from '@/stores/admin/quota'
import { useAdminClusterStore } from '@/stores/admin/cluster'
import { useSnackbarStore } from '@/stores/snackbar.js'

const adminStageStore = useAdminStageStore()
const adminQuotaStore = useAdminQuotaStore()
const adminClusterStore = useAdminClusterStore()
const snackbarStore = useSnackbarStore()

const selectedStage: Ref<Stage | Record<string, never>> = ref({})
const stageList: Ref<any[]> = ref([])
const associatedEnvironments: Ref<any[]> = ref([])
const isNewStageForm = ref(false)

const stages = computed(() => adminStageStore.stages)
const allQuotas = computed(() => adminQuotaStore.quotas)
const allClusters = computed(() => adminClusterStore.clusters)

const setStageTiles = (stages: Stage[]) => {
  stageList.value = sortArrByObjKeyAsc(stages, 'name')
    ?.map(stage => ({
      id: stage.id,
      title: stage.name,
      data: stage,
    }))
}

const setSelectedStage = async (stage: Stage) => {
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

const addStage = async (stage: CreateStageBody) => {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await adminStageStore.addStage(stage)
  await adminStageStore.getAllStages()
  snackbarStore.isWaitingForResponse = false
}

export type UpdateStageType = {
  stageId: UpdateQuotaStageBody['stageId'],
  quotaIds?: UpdateQuotaStageBody['quotaIds']
  clusterIds?: UpdateStageClustersBody['clusterIds']
}

const updateStage = async ({ stageId, quotaIds, clusterIds }: UpdateStageType) => {
  snackbarStore.isWaitingForResponse = true
  if (quotaIds) {
    await adminStageStore.updateQuotaStage(stageId, quotaIds)
  }
  if (clusterIds) {
    await adminStageStore.updateStageClusters(stageId, clusterIds)
  }
  await adminStageStore.getAllStages()
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const deleteStage = async (stageId: string) => {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await adminStageStore.deleteStage(stageId)
  await adminStageStore.getAllStages()
  snackbarStore.isWaitingForResponse = false
}

const getStageAssociatedEnvironments = async (stageId: string) => {
  snackbarStore.isWaitingForResponse = true
  associatedEnvironments.value = await adminStageStore.getStageAssociatedEnvironments(stageId)
  snackbarStore.isWaitingForResponse = false
}

onMounted(async () => {
  await adminQuotaStore.getAllQuotas()
  await adminClusterStore.getClusters()
  await adminStageStore.getAllStages()
  setStageTiles(stages.value)
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
      v-if="!Object.keys(selectedStage).length && !isNewStageForm"
      label="Ajouter un nouveau type d'environnement"
      data-testid="addStageLink"
      tertiary
      title="Ajouter un stage"
      class="fr-mt-2v <md:mb-2"
      icon="ri-add-line"
      @click="showNewStageForm()"
    />
    <div
      v-else
      class="w-full flex justify-end"
    >
      <DsfrButton
        title="Revenir à la liste des types d'environnement"
        data-testid="goBackBtn"
        secondary
        icon-only
        icon="ri-arrow-go-back-line"
        @click="() => cancel()"
      />
    </div>
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
      @add="(stage: CreateStageBody) => addStage(stage)"
      @cancel="cancel()"
    />
  </div>
  <div
    v-else
    :class="{
      'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !selectedStage?.name,
    }"
  >
    <div
      v-for="stage in stageList"
      :key="stage.id"
      class="fr-mt-2v fr-mb-4w w-full"
    >
      <div
        v-show="!Object.keys(selectedStage).length"
      >
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
        class="w-full"
        :is-new-stage="false"
        :associated-environments="associatedEnvironments"
        @cancel="cancel()"
        @update="(stage: UpdateStageType) => updateStage(stage)"
        @delete="(stageId: string) => deleteStage(stageId)"
      />
    </div>
    <div
      v-if="!stageList.length && !isNewStageForm"
    >
      <p>Aucun type d'environnement enregistré</p>
    </div>
  </div>
</template>
