<script lang="ts" setup>
import { ref } from 'vue'

interface Suggestion {
  value: string
  furtherInfo?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  suggestions: Suggestion[]
}>(), {
  modelValue: '',
  suggestions: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  selectSuggestion: [value: string]
  validate: []
}>()

const localValue = ref(props.modelValue)

function updateValue() {
  if (props.suggestions.find(suggestion => suggestion.value === localValue.value)) {
    emit('selectSuggestion', localValue.value)
  }
  emit('update:modelValue', localValue.value)
}
</script>

<template>
  <div>
    <DsfrInputGroup
      v-bind="$attrs"
      v-model="localValue"
      :value="props.modelValue"
      list="suggestionList"
      @update:model-value="updateValue()"
      @keyup.enter="emit('validate')"
    />
    <datalist
      id="suggestionList"
    >
      <option
        v-for="suggestion, i in props.suggestions"
        :key="`${i}-option`"
        :value="suggestion.value"
      >
        {{ suggestion.furtherInfo ? `${suggestion.furtherInfo} (${suggestion.value})` : suggestion.value }}
      </option>
    </datalist>
  </div>
</template>
