<script lang="ts" setup>
import { ref } from 'vue'
import { type User } from '@cpn-console/shared'

const props = withDefaults(defineProps<{
  modelValue: string
  suggestions: User[]
}>(), {
  modelValue: '',
  suggestions: () => [],
})

const localValue = ref(props.modelValue)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  selectSuggestion: [value: User]
}>()

const updateValue = () => {
  const matchingSuggestion = props.suggestions.find(suggestion => suggestion.email === localValue.value)
  if (matchingSuggestion) {
    emit('selectSuggestion', matchingSuggestion)

    return
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
    />
    <datalist
      id="suggestionList"
    >
      <option
        v-for="suggestion, i in props.suggestions"
        :key="i"
        :value="suggestion.email"
      >
        <div>
          {{ suggestion.lastName }} {{ suggestion.firstName }} ({{ suggestion.email }})
        </div>
      </option>
    </datalist>
  </div>
</template>
