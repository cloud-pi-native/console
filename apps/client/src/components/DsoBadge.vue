<script setup>
import { statusDict } from 'shared'

const props = defineProps({
  ressource: {
    type: Object,
    default: () => { },
    required: true,
  },
})
</script>

<template>
  <div
    class="flex gap-2"
    :data-testid="`${props.ressource?.id}-${statusDict[props.ressource?.ressourceKey][props.ressource?.[props.ressource?.ressourceKey]]?.testId}`"
  >
    <v-icon
      :name="statusDict[props.ressource?.ressourceKey][props.ressource?.[props.ressource?.ressourceKey]]?.icon"
      :fill="statusDict[props.ressource?.ressourceKey][props.ressource?.[props.ressource?.ressourceKey]]?.color"
      :animation="statusDict[props.ressource?.ressourceKey][props.ressource?.[props.ressource?.ressourceKey]]?.animation"
    />
    <span
      :class="`uppercase font-bold fr-text-default--${statusDict[props.ressource?.ressourceKey][props.ressource?.[props.ressource?.ressourceKey]]?.type}`"
    >
      {{ props.ressource?.wording }} : {{ statusDict[props.ressource?.ressourceKey][props.ressource?.[props.ressource?.ressourceKey]]?.wording }}
    </span>
  </div>
</template>
