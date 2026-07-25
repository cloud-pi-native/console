<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useLogStore } from '@/stores/log.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const adminLogStore = useLogStore()
const snackbarStore = useSnackbarStore()

const step = 10
const isUpdating = ref(true)
const page = ref(0)

const logs = computed(() => adminLogStore.logs)
const logsLength = computed(() => adminLogStore.count ?? 0)

async function showLogs(index: number) {
  page.value = index
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

onMounted(async () => {
  await getAllLogs({ offset: 0, limit: step }, false)
})
</script>

<template>
  <h1
    class="fr-h3"
  >
    Journaux des services associés à la chaîne DSO
  </h1>
  <LogsViewer
    :logs="logs"
    :total-length="logsLength"
    :is-updating="isUpdating"
    :page="page"
    :step="step"
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
