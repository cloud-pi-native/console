<script lang="ts" setup>
import { computed } from 'vue'
import type { ProjectV2 } from '@cpn-console/shared'
import { statusDict } from '@cpn-console/shared'

interface ResourceBase {
  id: ProjectV2['id']
  wording: string
}

type ResourceWithStatus = ResourceBase & {
  resourceKey: 'status'
  status: keyof typeof statusDict.status
}

type ResourceWithLock = ResourceBase & {
  resourceKey: 'locked'
  locked: keyof typeof statusDict.locked
}

type Resource = ResourceWithStatus | ResourceWithLock

export interface Props {
  resource: Resource
}

const props = defineProps<Props>()

const global = computed(() => {
  const type = props.resource.resourceKey
  if (type === 'status') {
    const status = props.resource[type]
    return statusDict[type][status]
  }
  const locked = props.resource[type]
  return statusDict[type][locked]
})
</script>

<template>
  <div
    class="flex gap-2"
    :data-testid="`${resource?.id}-${global?.testId}`"
    :title="global?.wording"
  >
    <v-icon
      :name="global?.icon"
      :fill="global?.color"
      :animation="global?.animation"
    />
  </div>
</template>
