<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminLogStore } from '@/stores/admin/log.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { JsonViewer } from 'vue3-json-viewer'

const adminLogStore = useAdminLogStore()
const snackbarStore = useSnackbarStore()

const step = 5
const isUpdating = ref(true)
const offset = ref(0)

const logs = computed(() => adminLogStore.logs)
const logsLength = computed(() => adminLogStore.count)

const showLogs = async (key) => {
  if (key === 'first' ||
    (key === 'previous' &&
    offset.value <= step)
  ) {
    offset.value = 0
  } else if (key === 'previous') {
    offset.value -= step
  } else if (key === 'last' ||
    (key === 'next' &&
      offset.value >= logsLength.value - step)) {
    offset.value = logsLength.value - step
  } else {
    offset.value += step
  }
  await getAllLogs({ offset: offset.value, limit: step })
}

const getAllLogs = async ({ offset, limit }, isDisplayingSuccess = true) => {
  isUpdating.value = true
  try {
    logs.value = await adminLogStore.getAllLogs({ offset, limit })
    if (isDisplayingSuccess) {
      snackbarStore.setMessage('Logs récupérés avec succès', 'success')
    }
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
  isUpdating.value = false
}

onMounted(async () => {
  await getAllLogs({ offset: offset.value, limit: step }, false)
})

</script>
<template>
  <h1
    class="fr-h3"
  >
    Logs des services associés à la chaîne DSO
  </h1>
  <div
    class="flex justify-between"
  >
    <DsfrAlert
      v-if="!isUpdating"
      :description="!logsLength ? 'Aucun logs en base de donnée.' : `Total : ${logsLength} logs`"
      data-testid="logCountInfo"
      type="info"
      small
    />
    <DsfrButton
      data-testid="refresh-btn"
      title="Renouveler l'appel"
      secondary
      icon-only
      icon="ri-refresh-fill"
      :disabled="isUpdating === true"
      @click="getAllLogs({ offset, limit: step })"
    />
  </div>

  <JsonViewer
    v-for="log in logs"
    :key="log.id"
    :data-testid="`${log.id}-json`"
    :value="log"
    class="log-box"
    copyable
    boxed
  />
  <div
    class="flex justify-between"
  >
    <div
      class="flex gap-2"
    >
      <DsfrButton
        title="voir les premiers logs"
        secondary
        icon-only
        :disabled="isUpdating === true || offset <= 0"
        icon="ri-arrow-drop-left-fill"
        @click="showLogs('first')"
      />
      <DsfrButton
        title="voir les logs précédents"
        secondary
        icon-only
        :disabled="isUpdating === true || offset <= 0"
        icon="ri-arrow-drop-left-line"
        @click="showLogs('previous')"
      />
    </div>
    <div
      class="flex gap-2"
    >
      <DsfrButton
        title="voir les logs suivants"
        secondary
        icon-only
        :disabled="isUpdating === true || offset >= logsLength - step"
        icon="ri-arrow-drop-right-line"
        @click="showLogs('next')"
      />
      <DsfrButton
        title="voir les derniers logs"
        secondary
        icon-only
        :disabled="isUpdating === true || offset >= logsLength - step"
        icon="ri-arrow-drop-right-fill"
        @click="showLogs('last')"
      />
    </div>
  </div>
</template>

<style>
.log-box.jv-container span.jv-item.jv-object,
.log-box.jv-container span.jv-key {
  color: var(--text-default-grey);
}

.log-box.jv-container {
  @apply my-6;

  background-color: var(--background-default-grey);
}
</style>
