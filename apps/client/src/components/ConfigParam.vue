<script lang="ts" setup>
import { DEFAULT, DISABLED, ENABLED } from '@cpn-console/shared'

const props = defineProps<{
  options: {
    value: Ref<string | boolean>
    description: string | undefined
    name: string | undefined
    disabled: boolean
    kind: 'text' | 'switch' | 'realSwitch'
    placeholder: string | undefined
    label: string | undefined
  }
}>()

const emit = defineEmits<{
  update: [data: string | boolean]
}>()
const switchOptions = [
  {
    label: 'Activé',
    value: ENABLED,
    disabled: false,
    inline: true,
  },
  {
    label: 'Par Défaut',
    value: DEFAULT,
    disabled: false,
    inline: true,
  },
  {
    label: 'Désactivé',
    value: DISABLED,
    disabled: false,
    inline: true,
  },
]
const switchOptionsDisabled = switchOptions.map(options => ({ ...options, disabled: true }))

const value = ref(props.options.value)

function set(data: string | boolean) {
  value.value = data
  emit('update', data)
}
</script>

<template>
  <div
    class="pr-8 self-center"
  >
    {{ props.options.name }}
  </div>
  <div>
    <DsfrInput
      v-if="props.options.kind === 'text' && !props.options.disabled"
      :model-value="value"
      :label="props.options.label"
      :label-visible="!!props.options.label"
      :placeholder="props.options.placeholder"
      data-testid="input"
      @update:model-value="(event: string) => set(event)"
    />
    <span
      v-else-if="props.options.kind === 'text' && props.options.disabled"
      :class="`${!props.options.value.value && 'italic text-sm'} self-end`"
    >
      {{ props.options.value || 'Non défini' }}
    </span>

    <DsfrRadioButtonSet
      v-else-if="props.options.kind === 'switch'"
      :name="options.name"
      :model-value="value"
      :options="props.options.disabled ? switchOptionsDisabled : switchOptions"
      :label="props.options.label"
      :label-visible="!!props.options.label"
      inline
      :small="false"
      data-testid="switch"
      @update:model-value="(event: string | number) => set(String(event))"
    />

    <DsfrToggleSwitch
      v-else-if="props.options.kind === 'realSwitch'"
      :name="options.name"
      :model-value="value"
      :options="props.options.disabled ? switchOptionsDisabled : switchOptions"
      :label="props.options.label"
      inline
      :small="false"
      data-testid="realSwitch"
      @update:model-value="(event: boolean) => set(event)"
    />
  </div>
  <div
    v-if="props.options.description"
    class="text-sm italic justify-self-center col-span-2"
  >
    {{ props.options.description }}
  </div>
  <hr
    v-if="props.options.description"
    class="col-span-2 p-1"
  >
</template>
