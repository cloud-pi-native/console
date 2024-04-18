<script lang="ts" setup>
import { ref, computed, onMounted, watch, type Ref } from 'vue'
import { useAdminQuotaStore } from '@/stores/admin/quota.js'
import { sortArrByObjKeyAsc } from '@cpn-console/shared'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import type { CreateQuotaBody, UpdateQuotaStageBody, Quota, PatchQuotaBody } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'

const adminQuotaStore = useAdminQuotaStore()
const projectEnvironmentStore = useProjectEnvironmentStore()
const snackbarStore = useSnackbarStore()

const quotas = computed(() => adminQuotaStore.quotas)
const selectedQuota: Ref<Quota | Record<string, never>> = ref({})
const quotaList: Ref<any[]> = ref([])
const allStages: Ref<any[]> = ref([])
const associatedEnvironments: Ref<any[]> = ref([])
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
    selectedQuota.value = {}
    return
  }
  selectedQuota.value = quota
  isNewQuotaForm.value = false
  // @ts-ignore
  await getQuotaAssociatedEnvironments(quota.id)
}

const showNewQuotaForm = () => {
  isNewQuotaForm.value = !isNewQuotaForm.value
  selectedQuota.value = {}
}

const cancel = () => {
  isNewQuotaForm.value = false
  selectedQuota.value = {}
}

const addQuota = async (quota: CreateQuotaBody) => {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await adminQuotaStore.addQuota(quota)
  await adminQuotaStore.getAllQuotas()
  snackbarStore.isWaitingForResponse = false
}

export type UpdateQuotaType = {
  quotaId: string,
  isPrivate?: PatchQuotaBody['isPrivate'],
  stageIds?: UpdateQuotaStageBody['stageIds']
}

const updateQuota = async ({ quotaId, isPrivate, stageIds }: UpdateQuotaType) => {
  snackbarStore.isWaitingForResponse = true
  if (isPrivate !== undefined) {
    await adminQuotaStore.updateQuotaPrivacy(quotaId, isPrivate)
  }
  await adminQuotaStore.updateQuotaStage(quotaId, stageIds)
  await adminQuotaStore.getAllQuotas()
  cancel()
  snackbarStore.isWaitingForResponse = false
}

const deleteQuota = async (quotaId: string) => {
  snackbarStore.isWaitingForResponse = true
  cancel()
  await adminQuotaStore.deleteQuota(quotaId)
  await adminQuotaStore.getAllQuotas()
  snackbarStore.isWaitingForResponse = false
}

const getQuotaAssociatedEnvironments = async (quotaId: string) => {
  snackbarStore.isWaitingForResponse = true
  associatedEnvironments.value = await adminQuotaStore.getQuotaAssociatedEnvironments(quotaId) ?? []
  snackbarStore.isWaitingForResponse = false
}

onMounted(async () => {
  await adminQuotaStore.getAllQuotas()
  setQuotaTiles(quotas.value)
  allStages.value = await projectEnvironmentStore.getStages()
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
      v-if="!Object.keys(selectedQuota).length && !isNewQuotaForm"
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
        v-show="!Object.keys(selectedQuota).length"
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
        v-if="Object.keys(selectedQuota).length && selectedQuota.id === quota.id"
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
