<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { sortArrByObjKeyAsc } from '@cpn-console/shared'
import type { CreateStageBody, Stage, StageAssociatedEnvironments, UpdateStageBody } from '@cpn-console/shared'
import { useStageStore } from '@/stores/stage'
import { useQuotaStore } from '@/stores/quota'
import { useClusterStore } from '@/stores/cluster'
import { useSnackbarStore } from '@/stores/snackbar'

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

function setStageTiles(stages: Stage[]) {
  stageList.value = sortArrByObjKeyAsc(stages, 'name')
    ?.map(stage => ({
      id: stage.id,
      title: stage.name,
      data: stage,
    }))
}

async function setSelectedStage(stage: Stage) {
  if (selectedStage.value?.name === stage.name) {
    selectedStage.value = undefined
    return
  }
  selectedStage.value = stage
  isNewStageForm.value = false
  await getStageAssociatedEnvironments(stage.id)
}

function showNewStageForm() {
  isNewStageForm.value = !isNewStageForm.value
  selectedStage.value = undefined
}

function cancel() {
  isNewStageForm.value = false
  selectedStage.value = undefined
}

async function addStage(stage: CreateStageBody) {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await stageStore.addStage(stage)
  await stageStore.getAllStages()
  snackbarStore.isWaitingForResponse = false
}

export type UpdateStageType = {
  id: Stage['id']
} & UpdateStageBody

async function updateStage({ id, ...stage }: UpdateStageType) {
  snackbarStore.isWaitingForResponse = true
  await stageStore.updateStage(id, stage)
  await stageStore.getAllStages()
  cancel()
  snackbarStore.isWaitingForResponse = false
}

async function deleteStage(stageId: string) {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await stageStore.deleteStage(stageId)
  await stageStore.getAllStages()
  snackbarStore.isWaitingForResponse = false
}

async function getStageAssociatedEnvironments(stageId: string) {
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
      icon="ri:add-line"
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
        icon="ri:arrow-go-back-line"
        @click="cancel"
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
  <div v-else-if="selectedStage">
    <StageForm
      v-if="selectedStage"
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
    v-else-if="stageList.length"
    class="flex flex-row flex-wrap gap-5 items-stretch justify-start gap-8 w-full"
  >
    <div
      v-for="stage in stageList"
      :key="stage.id"
      class="flex-basis-60 flex-stretch max-w-90"
    >
      <DsfrTile
        :title="stage.title"
        :data-testid="`stageTile-${stage.title}`"
        @click="setSelectedStage(stage.data)"
      />
    </div>
  </div>
  <div
    v-else
  >
    <p>Aucun type d'environnement enregistré</p>
  </div>
</template>
