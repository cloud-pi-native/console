<script lang="ts" setup>
import { ref } from 'vue'

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  level: {
    type: Number,
    default: 0,
  },
  levels: {
    type: Array,
    required: true,
    default: () => [],
  },
  step: {
    type: Number,
    default: 1,
  },
})

const localLevel = ref(props.level)

defineEmits(['updateLevel'])

</script>
<template>
  <div
    class="flex flex-col"
  >
    <label
      v-if="props.label"
      for="range"
      class="fr-label"
    >
      {{ label }}
      <span
        v-if="$attrs.required"
        class="required"
      >&nbsp;*</span>
    </label>
    <div class="flex flex-col">
      <input
        id="range"
        v-bind="$attrs"
        v-model="localLevel"
        class="range-input"
        name="range"
        type="range"
        list="rangeList"
        min="0"
        :step="props.step"
        :max="props.levels.length - 1"
        @input="$emit('updateLevel', $event.target?.value ?? 0)"
      >
      <datalist
        id="rangeList"
        class="range-list"
      >
        <option
          v-for="lvl, i in props.levels"
          :key="`${i}-level`"
          :value="i"
          :label="lvl"
        />
      </datalist>
    </div>
  </div>
</template>

<style scoped>
.range-input {
  appearance: auto;
}

.range-list {
  display: flex;
  font-size: 0.7rem;
  justify-content: space-between;
  writing-mode: horizontal-tb;
}
</style>
