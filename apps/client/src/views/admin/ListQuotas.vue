<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { sortArrByObjKeyAsc } from '@cpn-console/shared'
import type { CreateQuotaBody, Quota, QuotaAssociatedEnvironments, UpdateQuotaBody } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useQuotaStore } from '@/stores/quota.js'
import { useStageStore } from '@/stores/stage.js'

type UpdateQuotaType = UpdateQuotaBody & Pick<Quota, 'id'>
const quotaStore = useQuotaStore()
const snackbarStore = useSnackbarStore()
const stageStore = useStageStore()

const quotas = computed(() => quotaStore.quotas)
const selectedQuota = ref<Quota>()
const quotaList = ref<any[]>([])
const allStages = ref<any[]>([])
const associatedEnvironments = ref<QuotaAssociatedEnvironments>([])
const isNewQuotaForm = ref(false)

function setQuotaTiles(quotas: Quota[]) {
  quotaList.value = sortArrByObjKeyAsc(quotas, 'name')
    .map(quota => ({
      id: quota.id,
      title: quota.name,
      data: quota,
    }))
}

async function setSelectedQuota(quota: Quota) {
  if (selectedQuota.value?.name === quota.name) {
    selectedQuota.value = undefined
    return
  }
  selectedQuota.value = quota
  isNewQuotaForm.value = false
  await getQuotaAssociatedEnvironments(quota.id)
}

function showNewQuotaForm() {
  isNewQuotaForm.value = !isNewQuotaForm.value
  selectedQuota.value = undefined
}

function cancel() {
  isNewQuotaForm.value = false
  selectedQuota.value = undefined
}

async function addQuota(quota: CreateQuotaBody) {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await quotaStore.addQuota(quota)
  await stageStore.getAllStages()
  await quotaStore.getAllQuotas()
  snackbarStore.isWaitingForResponse = false
}

async function updateQuota(quota: UpdateQuotaType) {
  snackbarStore.isWaitingForResponse = true
  await quotaStore.updateQuota(quota.id, quota)
  await stageStore.getAllStages()
  await quotaStore.getAllQuotas()
  cancel()
  snackbarStore.isWaitingForResponse = false
}

async function deleteQuota(quotaId: string) {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await quotaStore.deleteQuota(quotaId)
  await stageStore.getAllStages()
  await quotaStore.getAllQuotas()
  snackbarStore.isWaitingForResponse = false
}

async function getQuotaAssociatedEnvironments(quotaId: string) {
  snackbarStore.isWaitingForResponse = true
  associatedEnvironments.value = await quotaStore.getQuotaAssociatedEnvironments(quotaId) ?? []
  snackbarStore.isWaitingForResponse = false
}

onMounted(async () => {
  await stageStore.getAllStages()
  await quotaStore.getAllQuotas()
  setQuotaTiles(quotas.value)
  allStages.value = await stageStore.getAllStages()
})

watch(quotas, () => {
  setQuotaTiles(quotas.value)
})
</script>

<template>
  <div
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      v-if="!selectedQuota && !isNewQuotaForm"
      label="Ajouter un nouveau quota"
      data-testid="addQuotaLink"
      tertiary
      title="Ajouter un quota"
      class="fr-mt-2v <md:mb-2"
      icon="ri:add-line"
      @click="showNewQuotaForm()"
    />
    <div
      v-else
      class="w-full flex justify-end"
    >
      <DsfrButton
        title="Revenir à la liste des quotas"
        data-testid="goBackBtn"
        secondary
        icon-only
        icon="ri:arrow-go-back-line"
        @click="() => cancel()"
      />
    </div>
  </div>
  <div
    v-if="isNewQuotaForm"
    class="my-5 pb-10 border-grey-900 border-y-1"
  >
    <QuotaForm
      :all-stages="allStages"
      class="w-full"
      :is-new-quota="true"
      @add="(quota: CreateQuotaBody) => addQuota(quota)"
      @cancel="cancel()"
    />
  </div>
  <div
    v-else-if="selectedQuota"
  >
    <QuotaForm
      :all-stages="allStages"
      :quota="selectedQuota"
      class="w-full"
      :is-new-quota="false"
      :associated-environments="associatedEnvironments"
      @cancel="cancel()"
      @update="(quota: UpdateQuotaType) => updateQuota(quota)"
      @delete="(quotaId: string) => deleteQuota(quotaId)"
    />
  </div>
  <div
    v-else-if="quotaList.length"
    class="flex flex-row flex-wrap gap-5 items-stretch justify-start gap-8 w-full"
  >
    <div
      v-for="quota in quotaList"
      :key="quota.id"
      class="flex-basis-60 flex-stretch max-w-90"
    >
      <DsfrTile
        :title="quota.title"
        :data-testid="`quotaTile-${quota.title}`"
        @click="setSelectedQuota(quota.data)"
      />
    </div>
    <div
      v-if="!quotaList.length && !isNewQuotaForm"
    >
      <p>Aucun quota enregistré</p>
    </div>
  </div>
</template>
