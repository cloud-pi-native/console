<script lang="ts" setup>
import { DEFAULT, DISABLED, ENABLED } from '@cpn-console/shared'
import { toValue } from 'vue'

const props = defineProps<{
  options: {
    value: globalThis.Ref<string>
    description: string | undefined
    name: string
    disabled: boolean
    kind: 'text' | 'switch'
    placeholder: string | undefined
    initialValue?: string
  }
}>()

const emit = defineEmits<{
  update: [data: string]
}>()
const switchOptions = [
  {
    label: 'Activé',
    value: ENABLED,
  },
  {
    label: 'Par Défaut',
    value: DEFAULT,
  },
  {
    label: 'Désactivé',
    value: DISABLED,
  },
]

const value = ref(toValue(props.options.value))

const switchLabelByValue: Record<string, string> = {
  [ENABLED]: 'Activé',
  [DISABLED]: 'Désactivé',
  [DEFAULT]: 'Par défaut',
}

function set(data: string) {
  value.value = data
  emit('update', data)
}
</script>

<template>
  <DsfrInput
    v-if="props.options.kind === 'text'"
    class="config-input"
    type="textarea"
    :model-value="value"
    :label="props.options.name"
    label-visible
    :hint="props.options.description"
    :placeholder="props.options.placeholder || 'Non défini'"
    data-testid="input"
    :disabled="props.options.disabled"
    @update:model-value="(event: string | number | undefined) => set(event as string)"
  />
  <div v-else-if="props.options.kind === 'switch'">
    <DsfrSegmentedSet
      :name="props.options.name"
      :model-value="value"
      :legend="props.options.name"
      :hint="props.options.description"
      :options="switchOptions"
      :disabled="props.options.disabled"
      data-testid="switch"
      @update:model-value="(event: string | number) => set(String(event))"
    />
    <p v-if="props.options.initialValue" class="text-xs text-gray-600 mt-1">
      Valeur par défaut backend : {{ switchLabelByValue[props.options.initialValue] ?? props.options.initialValue }}
    </p>
  </div>
  <hr
    class="col-span-2 p-1"
  >
</template>

<style>
.config-input.fr-input{
  background-color: var(--background-default-grey);
}
</style>
