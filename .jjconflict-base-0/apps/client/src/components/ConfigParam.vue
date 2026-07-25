<script lang="ts" setup>
import { DEFAULT, DISABLED, ENABLED } from '@cpn-console/shared'

const props = defineProps<{
  options: {
    value: globalThis.Ref<string>
    description: string | undefined
    name: string
    disabled: boolean
    kind: 'text' | 'switch'
    placeholder: string | undefined
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

const value = ref(props.options.value)

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
  <DsfrSegmentedSet
    v-else-if="props.options.kind === 'switch'"
    :name="options.name"
    :model-value="value"
    :legend="props.options.name"
    :hint="props.options.description"
    :options="switchOptions"
    :disabled="props.options.disabled"
    data-testid="switch"
    @update:model-value="(event: string | number) => set(String(event))"
  />
  <hr
    class="col-span-2 p-1"
  >
</template>

<style>
.config-input.fr-input{
  background-color: var(--background-default-grey);
}
</style>
