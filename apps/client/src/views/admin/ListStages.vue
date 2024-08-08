<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useStageStore } from '@/stores/stage.js'
import { sortArrByObjKeyAsc } from '@cpn-console/shared'
import type { CreateStageBody, Stage, StageAssociatedEnvironments, UpdateStageBody } from '@cpn-console/shared'
import { useQuotaStore } from '@/stores/quota'
import { useClusterStore } from '@/stores/cluster.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const stageStore = useStageStore()
const quotaStore = useQuotaStore()
const clusterStore = useClusterStore()
const snackbarStore = useSnackbarStore()

const selectedStage = ref<Stage>()
const stageList = ref<any[]>([])
const associatedEnvironments = ref<StageAssociatedEnvironments>([])
const isNewStageForm = ref(false)

const stages = computed(() => stageStore.stages)
const allQuotas = computed(() => quotaStore.quotas)
const allClusters = computed(() => clusterStore.clusters)

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
    selectedStage.value = undefined
    return
  }
  selectedStage.value = stage
  isNewStageForm.value = false
  // @ts-ignore
  await getStageAssociatedEnvironments(stage.id)
}

const showNewStageForm = () => {
  isNewStageForm.value = !isNewStageForm.value
  selectedStage.value = undefined
}

const cancel = () => {
  isNewStageForm.value = false
  selectedStage.value = undefined
}

const addStage = async (stage: CreateStageBody) => {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await stageStore.addStage(stage)
  await stageStore.getAllStages()
  snackbarStore.isWaitingForResponse = false
}

export type UpdateStageType = {
  id: Stage['id']
} & UpdateStageBody

const updateStage = async ({ id, ...stage }: UpdateStageType) => {
  snackbarStore.isWaitingForResponse = true
  await stageStore.updateStage(id, stage)
  await stageStore.getAllStages()
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const deleteStage = async (stageId: string) => {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await stageStore.deleteStage(stageId)
  await stageStore.getAllStages()
  snackbarStore.isWaitingForResponse = false
}

const getStageAssociatedEnvironments = async (stageId: string) => {
  snackbarStore.isWaitingForResponse = true
  associatedEnvironments.value = await stageStore.getStageAssociatedEnvironments(stageId) ?? []
  snackbarStore.isWaitingForResponse = false
}

onMounted(async () => {
  await quotaStore.getAllQuotas()
  await clusterStore.getClusters()
  await stageStore.getAllStages()
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
      v-if="!selectedStage && !isNewStageForm"
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
        v-show="!selectedStage"
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
        v-if="selectedStage && selectedStage.id === stage.id"
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
