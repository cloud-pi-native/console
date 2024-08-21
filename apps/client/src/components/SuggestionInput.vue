<script lang="ts" setup>
import { ref } from 'vue'
import { type User } from '@cpn-console/shared'

const props = withDefaults(defineProps<{
  modelValue: string
  suggestions: User[]
  invalidInput: boolean
}>(), {
  modelValue: '',
  suggestions: () => [],
})

const localValue = ref(props.modelValue)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: [value: User | string]
}>()

const updateValue = () => {
  emit('update:modelValue', localValue.value)
}

const submitInput = () => {
  if (props.suggestions.length) {
    emit('submit', props.suggestions[0])
  } else {
    emit('submit', localValue.value)
  }
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
      @keydown="(event: KeyboardEvent) => event.key === 'Enter' && submitInput()"
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
    <DsfrButton
      data-testid="addUserBtn"
      label="Ajouter l'utilisateur"
      secondary
      icon="ri-user-add-line"
      :disabled="props.invalidInput"
      @click="submitInput()"
    />
  </div>
</template>
