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
  disabled: {
    type: Boolean,
    default: false,
  },
})

const selectValue = ref(undefined)
const localArray = ref(props.array)

const arrayOptions = computed(() => props.options.map(element => ({
  text: element.name ?? element.label,
  value: element.name ?? element.label,
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
  <div
    class="fr-select-group"
  >
    <label
      class="fr-label"
    >
      {{ label }}
    </label>
    <select
      id="multi-select"
      name="multi-select"
      :disabled="props.disabled"
      :value="selectValue"
      class="fr-select"
      @change="addElementToArray($event.target.value)"
    >
      <p
        v-if="description"
        class="fr-hint-text"
      >
        {{ description }}
      </p>
      <option
        value=""
        class="hidden"
        disabled
      >
        Sélectionnez une option
      </option>
      <option
        v-for="arrayOption of arrayOptions"
        :key="arrayOption.id"
        :value="arrayOption.value"
      >
        {{ arrayOption.text }}
      </option>
    </select>
  </div>
  <div
    v-for="element in new Set(localArray)"
    :key="element"
    class="inline-block mr-1 ml-1"
  >
    <DsfrTag
      :label="element"
      :data-testid="`${element}-tag`"
      tag-name="button"
      :disabled="props.disabled"
      class="fr-tag--dismiss"
      @click="(event) => removeElementFromArray(event.target.outerText)"
    />
  </div>
</template>
