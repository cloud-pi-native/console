<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { sortArrByObjKeyAsc } from '@cpn-console/shared'
import type { CreateQuotaBody, Quota, UpdateQuotaBody, QuotaAssociatedEnvironments } from '@cpn-console/shared'
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

const setQuotaTiles = (quotas: Quota[]) => {
  quotaList.value = sortArrByObjKeyAsc(quotas, 'name')
    ?.map(quota => ({
      id: quota.id,
      title: quota.name,
      data: quota,
    }))
}

const setSelectedQuota = async (quota: Quota) => {
  if (selectedQuota.value?.name === quota.name) {
    selectedQuota.value = undefined
    return
  }
  selectedQuota.value = quota
  isNewQuotaForm.value = false
  // @ts-ignore
  await getQuotaAssociatedEnvironments(quota.id)
}

const showNewQuotaForm = () => {
  isNewQuotaForm.value = !isNewQuotaForm.value
  selectedQuota.value = undefined
}

const cancel = () => {
  isNewQuotaForm.value = false
  selectedQuota.value = undefined
}

const addQuota = async (quota: CreateQuotaBody) => {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await quotaStore.addQuota(quota)
  await quotaStore.getAllQuotas()
  snackbarStore.isWaitingForResponse = false
}

const updateQuota = async (quota: UpdateQuotaType) => {
  snackbarStore.isWaitingForResponse = true
  await quotaStore.updateQuota(quota.id, quota)
  await quotaStore.getAllQuotas()
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const deleteQuota = async (quotaId: string) => {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await quotaStore.deleteQuota(quotaId)
  await quotaStore.getAllQuotas()
  snackbarStore.isWaitingForResponse = false
}

const getQuotaAssociatedEnvironments = async (quotaId: string) => {
  snackbarStore.isWaitingForResponse = true
  associatedEnvironments.value = await quotaStore.getQuotaAssociatedEnvironments(quotaId) ?? []
  snackbarStore.isWaitingForResponse = false
}

onMounted(async () => {
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
      icon="ri-add-line"
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
        icon="ri-arrow-go-back-line"
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
    v-else
    :class="{
      'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !selectedQuota?.name,
    }"
  >
    <div
      v-for="quota in quotaList"
      :key="quota.id"
      class="fr-mt-2v fr-mb-4w w-full"
    >
      <div
        v-show="!selectedQuota"
      >
        <DsfrTile
          :title="quota.title"
          :data-testid="`quotaTile-${quota.title}`"
          :horizontal="!!selectedQuota?.name"
          class="fr-mb-2w w-11/12"
          @click="setSelectedQuota(quota.data)"
        />
      </div>
      <QuotaForm
        v-if="selectedQuota && selectedQuota.id === quota.id"
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
      v-if="!quotaList.length && !isNewQuotaForm"
    >
      <p>Aucun quota enregistré</p>
    </div>
  </div>
</template>
