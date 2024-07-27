<script lang="ts" setup>
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  suggestions: unknown[]
}>(), {
  modelValue: '',
  suggestions: () => [],
})

const localValue = ref(props.modelValue)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  selectSuggestion: [value: string]
}>()

const updateValue = () => {
  if (props.suggestions.find(suggestion => suggestion === localValue.value)) {
    emit('selectSuggestion', localValue.value)
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
        :key="`${i}-suggestion`"
        :value="suggestion"
      />
    </datalist>
  </div>
</template>
