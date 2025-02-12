<script lang="ts" setup>
import { ref } from 'vue'
import type { CleanLog, Log, XOR } from '@cpn-console/shared'
// @ts-ignore 'vue3-json-viewer' missing types
import { JsonViewer } from 'vue3-json-viewer'
import router from '@/router/index.js'

const props = withDefaults(defineProps<{
  totalLength: number
  logs: XOR<CleanLog, Log>[]
  isUpdating: boolean
  page: number
  step?: number
  mode?: 'full' | 'hide' | 'hideDetails'
  paginationPosition?: 'top' | 'bottom' | 'both'
  hideTotalEvents?: boolean
  headerClass?: string
  bodyClass?: string
}>(), {
  step: 10,
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
        :icon="hideLogDetails ? 'ri:filter-off-line' : 'ri:filter-line'"
        @click="hideLogDetails = !hideLogDetails"
      />
      <DsfrButton
        v-if="mode !== 'hide'"
        data-testid="showLogsBtn"
        :title="hideLogs ? 'Afficher les logs' : 'Masquer les logs'"
        secondary
        icon-only
        :icon="hideLogs ? 'ri:eye-off-line' : 'ri:eye-line'"
        @click="hideLogs = !hideLogs"
      />
      <DsfrButton
        class="shrink h-min"
        data-testid="refreshBtn"
        title="Renouveler l'appel"
        secondary
        icon-only
        :disabled="isUpdating"
        :icon="{ name: 'ri:refresh-line', animation: isUpdating ? 'spin' : undefined }"
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
    <Loader
      v-if="isUpdating"
      class="p-15"
    />
    <div
      v-else-if="!logs.length"
      class="text-center mt-2"
    >
      Aucun événement à afficher
    </div>
    <div
      v-else
      class="flex flex-col gap-5 mt-5"
    >
      <div
        v-for="log in logs"
        :key="log.id"
        :class="`log-box border-solid ${log.data?.warning?.length ? 'log-box--warning' : log.data?.failed ? 'log-box--error' : 'log-box--success'}`"
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
            <a
              v-if="log.data?.args?.slug && router.currentRoute.value.name === 'ListLogs'"
              :href="`/admin/projects/${log.data.args.slug}`"
              @click.prevent="router.push({ name: 'AdminProject', params: { slug: log.data.args.slug } })"
            >
              <Badge
                type="project"
                :name="log.data.args.slug"
              />
            </a>
            <DsfrBadge
              v-if="typeof log?.data?.totalExecutionTime !== 'undefined'"
              :label="`${log.data.totalExecutionTime} ms`"
              no-icon
            />
            <DsfrBadge
              :label="(new Date(log.createdAt)).toLocaleString()"
              no-icon
            />
          </div>
        </div>
        <template
          v-if="hideLogs"
        >
          <pre
            v-if="log.data.messageResume"
            :data-testid="`${log.id}-json`"
            copyable
            style="white-space: pre-wrap; "
          >{{ log.data.messageResume.trim() }}</pre>
        </template>
        <JsonViewer
          v-else
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
  </div>
</template>
