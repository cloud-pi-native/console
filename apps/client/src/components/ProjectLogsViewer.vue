<script lang="ts" setup>
import type { CleanLog } from '@cpn-console/shared'
import { ref, watch } from 'vue'
import type { Project } from '@/utils/project-utils.js'

const props = defineProps<{
  project: Project
  asProfile: 'user' | 'admin'
}>()

const step = props.asProfile === 'user' ? 5 : 15
const isUpdating = ref(false)
const page = ref(0)

const logs = ref<CleanLog[]>([])
const totalLength = ref(0)

async function showLogs(newPage?: number) {
  if (newPage != null) page.value = newPage
  isUpdating.value = true
  const res = await props.project.Logs.list({ offset: page.value * step, limit: step, clean: props.asProfile === 'user' ? 'true' : 'false' })
  logs.value = res.logs
  totalLength.value = res.total
  isUpdating.value = false
}

watch(props.project, () => showLogs())

onMounted(showLogs)
</script>

<template>
  <LogsViewer
    :key="project.id"
    :logs="logs"
    :total-length="totalLength"
    :is-updating="isUpdating"
    :page="page"
    :step="step"
    header-class="grid-col-2 shrink"
    body-class="grid-col-span-2 mt-1 w-full"
    :mode="asProfile === 'user' ? 'hide' : 'full'"
    hide-total-events
    :pagination-position="step >= 10 ? 'both' : 'top'"
    @move-page="(i: number) => showLogs(i)"
  />
</template>
