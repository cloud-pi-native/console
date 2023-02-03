<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  listId: {
    type: String,
    default: 'suggestionInput',
  },
  datalist: {
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

watch(localValue, () => {
  if (!props.datalist.includes(localValue.value)) return
  emit('updateValue', localValue.value)
  localValue.value = ''
})

</script>
<template>
  <DsfrInputGroup
    v-bind="$attrs"
    v-model="localValue"
    :list="props.listId"
  />
  <datalist
    :id="props.listId"
  >
    <option
      v-for="data, i in props.datalist"
      :key="i"
      :value="data"
    />
  </datalist>
</template>
