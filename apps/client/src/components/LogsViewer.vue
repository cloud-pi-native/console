<script lang="ts" setup>
import { ref } from 'vue'
import type { CleanLog, Log, XOR } from '@cpn-console/shared'
// @ts-ignore 'vue3-json-viewer' missing types
import { JsonViewer } from 'vue3-json-viewer'

const props = withDefaults(defineProps<{
  totalLength: number
  logs: XOR<CleanLog, Log>[]
  isUpdating: boolean
  page: number
  step: number
  mode: 'full' | 'hide' | 'hideDetails'
  paginationPosition: 'top' | 'bottom' | 'both'
  hideTotalEvents: boolean
  headerClass: string
  bodyClass: string
}>(), {
  totalLength: 0,
  paginationPosition: 'both',
  hideTotalEvents: false,
  headerClass: '',
  bodyClass: '',
})

const emits = defineEmits<{
  movePage: [index: number]
}>()

const hideLogs = ref(props.mode === 'hide')
const hideLogDetails = ref(props.mode === 'hideDetails')

type LogModelSliced = Omit<Log['data'], 'failed'>
  | Omit<Log['data'], 'failed' | 'totalExecutionTime'>

function sliceLog(log: Log | CleanLog): LogModelSliced {
  const data = log.data
  if (!data.failed || data.warning?.length) {
    const {
      totalExecutionTime: _t,
      failed: _f,
      warning: _w,
      ...logSliced
    } = data
    return logSliced
  }
  const {
    totalExecutionTime: _t,
    ...logSliced
  } = data
  return logSliced
}

async function showLogs(index: number) {
  emits('movePage', index)
}
</script>

<template>
  <div
    :class="`flex justify-between ${headerClass}`"
  >
    <DsfrAlert
      v-if="!isUpdating && !hideTotalEvents"
      :description="!totalLength ? 'Aucun événement à afficher' : `Total : ${totalLength} événements`"
      data-testid="logCountInfo"
      type="info"
      small
    />
    <div
      class="flex gap-2 w-min"
    >
      <DsfrButton
        v-if="mode !== 'hide'"
        data-testid="logsDetailsBtn"
        :title="hideLogDetails ? 'Afficher les logs en entier' : 'Masquer les clés non essentielles des logs'"
        secondary
        icon-only
        :icon="hideLogDetails ? 'ri:filter-off-fill' : 'ri:filter-fill'"
        @click="hideLogDetails = !hideLogDetails"
      />
      <DsfrButton
        v-if="mode !== 'hide'"
        data-testid="showLogsBtn"
        :title="hideLogs ? 'Afficher les logs' : 'Masquer les logs'"
        secondary
        icon-only
        :icon="hideLogs ? 'ri:eye-off-fill' : 'ri:eye-fill'"
        @click="hideLogs = !hideLogs"
      />
      <DsfrButton
        class="shrink h-min"
        data-testid="refreshBtn"
        title="Renouveler l'appel"
        secondary
        icon-only
        :disabled="isUpdating"
        :icon="{ name: 'ri:refresh-fill', animation: isUpdating ? 'spin' : '' }"
        @click="showLogs(page)"
      />
    </div>
  </div>
  <div
    :class="bodyClass || 'mt-5'"
  >
    <PaginationCt
      v-if="['top', 'both'].includes(paginationPosition)"
      :length="totalLength"
      :page="page"
      :step="step"
      @set-page="showLogs($event)"
    />
    <div
      v-for="log in logs"
      :key="log.id"
      :class="`log-box my-5 border-solid ${log.data?.warning?.length ? 'log-box--warning' : log.data?.failed ? 'log-box--error' : 'log-box--success'}`"
    >
      <div
        class="flex flex-wrap justify-between"
      >
        <DsfrBadge
          :label="log.action"
          :type="log.data?.failed ? 'error' : log.data?.warning?.length ? 'warning' : 'success'"
        />
        <div
          class="flex gap-2"
        >
          <DsfrBadge
            v-if="log?.data?.totalExecutionTime"
            :label="`${log.data.totalExecutionTime} ms`"
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
          :label="`Log ID: ${log.id}`"
          type="new"
          no-icon
        />
        <DsfrBadge
          :label="`user ID: ${log.userId}`"
          type="new"
          no-icon
        />
        <DsfrBadge
          v-if="log.requestId"
          :label="`Request ID: ${log.requestId}`"
          type="new"
          no-icon
        />
      </div>
    </div>
    <PaginationCt
      v-if="['bottom', 'both'].includes(paginationPosition)"
      :length="totalLength"
      :page="page"
      :step="step"
      @set-page="showLogs($event)"
    />
  </div>
</template>
