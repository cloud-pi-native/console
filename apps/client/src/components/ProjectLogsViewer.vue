<script lang="ts" setup>
import type { CleanLog, ProjectV2 } from '@cpn-console/shared'
import { ref, watch } from 'vue'
import { useLogStore } from '../stores/log.js'
import { useProjectStore } from '@/stores/project.js'

const props = withDefaults(defineProps<{
  projectId: ProjectV2['id']
}>(), {
})

const logStore = useLogStore()
const projectStore = useProjectStore()

const step = 5
const isUpdating = ref(false)
const page = ref(0)

const logs = ref<CleanLog[]>([])
const totalLength = ref(0)

async function showLogs(index?: number) {
  page.value = index ?? page.value
  getProjectLogs({ offset: page.value * step, limit: step })
}

async function getProjectLogs({ offset, limit }: { offset: number, limit: number }) {
  isUpdating.value = true
  const res = await logStore.listLogs({ offset, limit, projectId: props.projectId, clean: true })
  logs.value = res.logs as CleanLog[]
  totalLength.value = res.total
  isUpdating.value = false
}

function toggleDisplayLogs() {
  logStore.displayProjectLogs = !logStore.displayProjectLogs
  showLogs()
}

watch(logStore, () => {
  if (logStore.needRefresh) {
    showLogs()
    logStore.needRefresh = false
  }
})

watch(projectStore, () => {
  if (!projectStore.selectedProject) {
    logStore.needRefresh = false
    logStore.displayProjectLogs = true
  }
})
</script>

<template>
  <div
    :class="`fixed bottom-0 right-0 z-1000 top-40 shadow-lg flex fr-btn--secondary h-130 transition-all ${logStore.displayProjectLogs ? '' : 'translate-x-90'}`"
  >
    <div
      class="log-btn origin-bottom-left -rotate-90 h-max w-min absolute top-20 left-1px"
    >
      <DsfrButton
        data-testid="displayLogsBtn"
        label="Journaux"
        secondary
        small
        @click="toggleDisplayLogs"
      />
    </div>
    <div
      class="h-max-140 w-90 p-5 items-center overflow-y-scroll log-panel"
      data-testid="displayLogsPanel"
    >
      <div
        class="flex gap-4 flex-row flex-wrap"
      >
        <h4
          id="logsView"
          class="mb-2"
        >
          Journaux du projet
        </h4>
        <LogsViewer
          :logs="logs"
          :total-length="totalLength"
          :is-updating="isUpdating"
          :page="page"
          :step="step"
          header-class="grid-col-2 shrink"
          body-class="grid-col-span-2 mt-1"
          mode="hide"
          hide-total-events
          pagination-position="top"
          @move-page="showLogs"
        />
      </div>
    </div>
  </div>
</template>
