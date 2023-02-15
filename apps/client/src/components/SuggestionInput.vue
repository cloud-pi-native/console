<script setup>
import { ref } from 'vue'

const props = defineProps({
  suggestions: {
    type: Array,
    required: true,
    default: () => [],
  },
  value: {
    type: String,
    default: '',
  },
})

const localValue = ref(props.value)

const emit = defineEmits(['updateValue'])

const updateValue = () => {
  if (!props.suggestions.includes(localValue.value)) return
  emit('updateValue', localValue.value)
  localValue.value = ''
}

</script>
<template>
  <div>
    <DsfrInputGroup
      v-bind="$attrs"
      v-model="localValue"
      list="suggestionList"
      @blur="updateValue()"
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
