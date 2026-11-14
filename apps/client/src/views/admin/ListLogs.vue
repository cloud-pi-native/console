<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLogStore } from '@/stores/log.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { parseLogsViewQuery, serializeLogsViewState } from '@/utils/logs-view.js'

const adminLogStore = useLogStore()
const snackbarStore = useSnackbarStore()
const router = useRouter()

const step = 10
const isUpdating = ref(true)
const viewState = ref(parseLogsViewQuery(router.currentRoute.value.query))
const page = computed(() => viewState.value.page)
const hideLogs = computed(() => viewState.value.hideLogs)
const hideLogDetails = computed(() => viewState.value.hideLogDetails)

const logs = computed(() => adminLogStore.logs)
const logsLength = computed(() => adminLogStore.count ?? 0)

function syncQuery() {
  router.replace({ query: serializeLogsViewState(viewState.value) })
}

function setHideLogs(value: boolean) {
  viewState.value.hideLogs = value
  syncQuery()
}

function setHideLogDetails(value: boolean) {
  viewState.value.hideLogDetails = value
  syncQuery()
}

async function showLogs(index: number) {
  viewState.value.page = index
  syncQuery()
  await getAllLogs({ offset: index * step, limit: step })
}
async function getAllLogs({ offset, limit }: { offset: number, limit: number }, isDisplayingSuccess = true) {
  isUpdating.value = true
  await adminLogStore.getAllLogs({ offset, limit })
  if (isDisplayingSuccess) {
    snackbarStore.setMessage('Logs récupérés avec succès', 'success')
  }
  isUpdating.value = false
}

async function copyCurrentLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    snackbarStore.setMessage('Lien copié', 'success')
  } catch (error: any) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

onMounted(async () => {
  await getAllLogs({ offset: page.value * step, limit: step }, false)
})
</script>

<template>
  <div class="flex justify-between items-center">
    <h1
      class="fr-h3"
    >
      Journaux des services associés à la chaîne DSO
    </h1>
    <DsfrButton
      data-testid="copyLogsLinkBtn"
      label="Copier le lien"
      title="Copier le lien de la vue courante"
      secondary
      @click="copyCurrentLink"
    />
  </div>
  <LogsViewer
    :logs="logs"
    :total-length="logsLength"
    :is-updating="isUpdating"
    :page="page"
    :step="step"
    :hide-logs="hideLogs"
    :hide-log-details="hideLogDetails"
    @update:hide-logs="setHideLogs"
    @update:hide-log-details="setHideLogDetails"
    @move-page="showLogs"
  />
</template>

<style>
.json-box.jv-container span.jv-item.jv-object,
.json-box.jv-container span.jv-key {
  color: var(--text-default-grey);
}

.json-box.jv-container {
  @apply my-6;

  background-color: var(--background-default-grey);
}
</style>
