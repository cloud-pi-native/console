<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminLogStore } from '@/stores/admin/log.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { Log } from '@cpn-console/shared'
import { JsonViewer } from 'vue3-json-viewer'

const adminLogStore = useAdminLogStore()
const snackbarStore = useSnackbarStore()

const step = 10
const isUpdating = ref(true)
const page = ref(0)
const hideLogs = ref(false)
const hideLogDetails = ref(true)

const logs = computed(() => adminLogStore.logs)
const logsLength = computed(() => adminLogStore.count)

const showLogs = async (index: number) => {
  page.value = index
  await getAllLogs({ offset: index * step, limit: step })
}

type LogModelSliced = Omit<Log['data'], 'totalExecutiontime'>
const sliceLog = (log: Log): LogModelSliced => {
  const {
    data: {
      totalExecutionTime: _t,
      ...logSliced
    },
  } = log
  if (!logSliced.failed) delete logSliced.failed
  return logSliced
}

const getAllLogs = async ({ offset, limit }: { offset: number, limit: number }, isDisplayingSuccess = true) => {
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
  <div
    class="flex justify-between py-4"
  >
    <DsfrAlert
      v-if="!isUpdating"
      :description="!logsLength ? 'Aucun événement à afficher' : `Total : ${logsLength} événements`"
      data-testid="logCountInfo"
      type="info"
      small
    />
    <div
      class="flex gap-2"
    >
      <DsfrButton
        data-testid="logsDetailsBtn"
        :title="hideLogDetails ? 'Afficher les logs en entier': 'Masquer les clés non essentielles des logs'"
        secondary
        icon-only
        :icon="hideLogDetails ? 'ri-filter-off-fill' : 'ri-filter-fill'"
        @click="hideLogDetails = !hideLogDetails"
      />
      <DsfrButton
        data-testid="showLogsBtn"
        :title="hideLogs ? 'Afficher les logs': 'Masquer les logs'"
        secondary
        icon-only
        :icon="hideLogs ? 'ri-eye-off-fill' : 'ri-eye-fill'"
        @click="hideLogs = !hideLogs"
      />
      <DsfrButton
        data-testid="refreshBtn"
        title="Renouveler l'appel"
        secondary
        icon-only
        icon="ri-refresh-fill"
        :disabled="isUpdating"
        @click="showLogs(page)"
      />
    </div>
  </div>
  <PaginationCt
    :length="logsLength"
    :is-updating="isUpdating"
    :page="page"
    :step="step"
    @set-page="showLogs($event)"
  />
  <div
    v-for="log in logs"
    :key="log.id"
    :class="`my-5 border-solid ${log.data?.failed ? 'border-red-100' : 'border-zinc-100'}`"
  >
    <div
      class="flex flex-wrap justify-between"
    >
      <DsfrBadge
        :label="log.action"
        :type="log.data?.failed ? 'error' : 'success'"
      />
      <div
        class="flex gap-2"
      >
        <DsfrBadge
          v-if="log?.data?.totalExecutionTime"
          :label="log.data.totalExecutionTime + ' ms'"
          no-icon
        />
        <DsfrBadge
          :label="(new Date(log.createdAt)).toLocaleString()"
          no-icon
        />
      </div>
    </div>
    <JsonViewer
      v-if="!hideLogs"
      :data-testid="`${log.id}-json`"
      :value="hideLogDetails ? sliceLog(log) : log"
      class="json-box !my-0"
      copyable
    />
    <div
      style="display: none;"
      class="flex flex-wrap justify-between"
    >
      <DsfrBadge
        :label="'Log ID: ' + log.id"
        type="new"
        no-icon
      />
      <DsfrBadge
        :label="'user ID: ' + log.userId"
        type="new"
        no-icon
      />
      <DsfrBadge
        :label="'Request ID: ' + log.requestId"
        type="new"
        no-icon
      />
    </div>
  </div>
  <PaginationCt
    :length="logsLength"
    :is-updating="isUpdating"
    :page="page"
    :step="step"
    @set-page="showLogs($event)"
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
