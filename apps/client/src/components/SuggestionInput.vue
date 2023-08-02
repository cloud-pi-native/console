<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  suggestions: {
    type: Array,
    required: true,
    default: () => [],
  },
})

const localValue = ref(props.modelValue)

const emit = defineEmits(['update:modelValue', 'selectSuggestion'])

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
      @input="updateValue()"
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
