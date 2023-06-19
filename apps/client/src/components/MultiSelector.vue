<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  options: {
    type: Array,
    default: () => [],
  },
  array: {
    type: Array,
    default: () => [],
  },
  label: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
})

const localArray = ref(props.array)

const arrayOptions = computed(() => props.options.map(element => ({
  text: element.name,
  value: element.name,
  id: element.id,
})))

const emit = defineEmits(['update'])

const addElementToArray = (element) => {
  localArray.value.push(element)
  emit('update', Array.from(new Set(localArray.value)))
}

const removeElementFromArray = (elementToDelete) => {
  localArray.value = localArray.value.filter(element => element !== elementToDelete)
  emit('update', Array.from(new Set(localArray.value)))
}
</script>

<template>
  <DsfrSelect
    select-id="element-select"
    :label="label"
    :description="description"
    label-visible
    :options="arrayOptions"
    @update:model-value="addElementToArray($event)"
  />
  <div
    v-for="element in new Set(localArray)"
    :key="element"
    class="inline-block mr-1 ml-1"
  >
    <DsfrTag
      :label="element"
      tag-name="button"
      class="fr-tag--dismiss"
      @click="(event) => removeElementFromArray(event.target.outerText)"
    />
  </div>
</template>
