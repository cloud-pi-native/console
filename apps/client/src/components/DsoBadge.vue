<script lang="ts" setup>
import { statusDict, type ProjectModel } from '@dso-console/shared'

type ResourceBase = {
  id: ProjectModel['id'],
  wording: string,
}

type ResourceWithStatus = ResourceBase & {
  resourceKey: 'status',
  status: ProjectModel['status']
}

type ResourceWithLock = ResourceBase & {
  resourceKey: 'locked',
  locked: keyof typeof statusDict.locked,
}

type Resource = ResourceWithStatus | ResourceWithLock

export interface Props {
  resource: Resource
}

const props = defineProps<Props>()
</script>

<template>
  {{ props.resource[props.resource.resourceKey] }}
  <div
    class="flex gap-2"
    :data-testid="`${props.resource.id}-${statusDict[props.resource[props.resource.resourceKey]]?.testId}`"
  >
    <v-icon
      :name="statusDict[props.resource[props.resource.resourceKey]]?.icon"
      :fill="statusDict[props.resource[props.resource.resourceKey]]?.color"
      :animation="statusDict[props.resource[props.resource.resourceKey]]?.animation"
    />
    <span
      :class="`uppercase font-bold fr-text-default--${statusDict[props.resource[props.resource.resourceKey]]?.type}`"
    >
      {{ props.resource.wording }} : {{ statusDict[props.resource[resource.resourceKey]]?.wording }}
    </span>
  </div>
</template>
