<script lang="ts" setup>
import { ref, computed, onMounted, watch, type Ref } from 'vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useAdminQuotaStore } from '@/stores/admin/quota.js'
import QuotaForm from '@/components/QuotaForm.vue'
import { sortArrByObjKeyAsc } from '@dso-console/shared'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import type { CreateQuotaDto, UpdateQuotaStageDto, DeleteQuotaDto, QuotaModel, UpdateQuotaPrivacyDto } from '@dso-console/shared'

const adminQuotaStore = useAdminQuotaStore()
const projectEnvironmentStore = useProjectEnvironmentStore()
const snackbarStore = useSnackbarStore()

const quotas = computed(() => adminQuotaStore.quotas)
const selectedQuota: Ref<QuotaModel | Record<string, never>> = ref({})
const quotaList: Ref<any[]> = ref([])
const allStages: Ref<any[]> = ref([])
const associatedEnvironments: Ref<any[]> = ref([])
const isWaitingForResponse = ref(false)
const isNewQuotaForm = ref(false)

const setQuotaTiles = (quotas: QuotaModel[]) => {
  quotaList.value = sortArrByObjKeyAsc(quotas, 'name')
    ?.map(quota => ({
      id: quota.id,
      title: quota.name,
      data: quota,
    }))
}

const setSelectedQuota = async (quota: QuotaModel) => {
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

const addQuota = async (quota: CreateQuotaDto['body']) => {
  isWaitingForResponse.value = true
  cancel()
  try {
    await adminQuotaStore.addQuota(quota)
    await adminQuotaStore.getAllQuotas()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

export type UpdateQuotaType = {
  quotaId: UpdateQuotaPrivacyDto['params']['quotaId'],
  isPrivate?: UpdateQuotaPrivacyDto['body']['isPrivate'],
  stageIds?: UpdateQuotaStageDto['body']['stageIds']
}

const updateQuota = async ({ quotaId, isPrivate, stageIds }: UpdateQuotaType) => {
  isWaitingForResponse.value = true
  try {
    await adminQuotaStore.updateQuotaPrivacy(quotaId, isPrivate)
    await adminQuotaStore.updateQuotaStage(quotaId, stageIds)
    await adminQuotaStore.getAllQuotas()
    cancel()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

const deleteQuota = async (quotaId: DeleteQuotaDto['params']['quotaId']) => {
  isWaitingForResponse.value = true
  cancel()
  try {
    await adminQuotaStore.deleteQuota(quotaId)
    await adminQuotaStore.getAllQuotas()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

const getQuotaAssociatedEnvironments = async (quotaId: DeleteQuotaDto['params']['quotaId']) => {
  isWaitingForResponse.value = true
  try {
    associatedEnvironments.value = await adminQuotaStore.getQuotaAssociatedEnvironments(quotaId)
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

onMounted(async () => {
  try {
    await adminQuotaStore.getAllQuotas()
    setQuotaTiles(quotas.value)
    allStages.value = await projectEnvironmentStore.getStages()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
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
      label="Ajouter un nouveau quota"
      data-testid="addQuotaLink"
      tertiary
      title="Ajouter un quota"
      class="fr-mt-2v <md:mb-2"
      icon="ri-add-line"
      @click="showNewQuotaForm()"
    />
  </div>
  <div
    v-if="isNewQuotaForm"
    class="my-5 pb-10 border-grey-900 border-y-1"
  >
    <QuotaForm
      :all-stages="allStages"
      class="w-full"
      :is-new-quota="true"
      :is-updating-quota="isWaitingForResponse"
      @add="(quota: CreateQuotaDto['body']) => addQuota(quota)"
      @cancel="cancel()"
    />
  </div>
  <div
    :class="{
      'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !selectedQuota?.name,
    }"
  >
    <div
      v-for="quota in quotaList"
      :key="quota.id"
      class="fr-mt-2v fr-mb-4w w-full"
    >
      <div>
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
        :is-updating-quota="isWaitingForResponse"
        class="w-full"
        :is-new-quota="false"
        :associated-environments="associatedEnvironments"
        @cancel="cancel()"
        @update="(quota: UpdateQuotaType) => updateQuota(quota)"
        @delete="(quotaId: DeleteQuotaDto['params']['quotaId']) => deleteQuota(quotaId)"
      />
    </div>
    <div
      v-if="!quotaList.length && !isNewQuotaForm"
    >
      <p>Aucun quota enregistré</p>
    </div>
  </div>
</template>
