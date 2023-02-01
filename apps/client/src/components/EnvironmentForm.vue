<script setup>
import { ref, onMounted } from 'vue'
import { environmentSchema, schemaValidator, instanciateSchema } from 'shared'
import { allEnv } from 'shared/src/utils/iterables.js'

const props = defineProps({
  environment: {
    type: Object,
    default: () => {},
  },
  environmentNames: {
    type: Array,
    default: () => [],
  },
  isEditable: {
    type: Boolean,
    default: true,
  },
})

const localEnvironment = ref(props.environment)

const updatedValues = ref({})

const environmentOptions = ref([])

const setEnvironmentOptions = () => {
  const availableEnvironments = props.environmentNames.length
    ? allEnv
      .filter(env => !props.environmentNames
        .includes(env))
    : allEnv
  environmentOptions.value = availableEnvironments.map(env => ({
    text: env,
    value: env,
  }))
}

const updateEnvironment = (key, value) => {
  localEnvironment.value[key] = value
  updatedValues.value[key] = true
}

const emit = defineEmits(['add', 'cancel'])

const addEnvironment = () => {
  updatedValues.value = instanciateSchema({ schema: environmentSchema }, true)
  const errorSchema = schemaValidator(environmentSchema, localEnvironment.value)

  if (Object.keys(errorSchema).length === 0) {
    emit('add', localEnvironment.value)
  } else {
    console.log(errorSchema)
  }
}

const cancel = (event) => {
  emit('cancel', event)
}

onMounted(() => {
  setEnvironmentOptions()
})

</script>

<template>
  <h1
    v-if="props.isEditable"
    class="fr-h1"
  >
    Ajouter un environnement au projet
  </h1>
  <DsfrFieldset
    :key="environment"
    :legend="props.isEditable ? 'Informations de l\'environnement' : undefined"
    :hint="props.isEditable ? 'Les champs munis d\'une astérisque (*) sont requis' : undefined"
    data-testid="environmentFieldset"
  >
    <DsfrSelect
      v-model="localEnvironment.name"
      data-testid="environmentNameSelect"
      label="Nom de l'environnement"
      required="required"
      :disabled="!props.isEditable"
      :options="environmentOptions"
      @update:model-value="updateEnvironment('name', $event)"
    />
  </DsfrFieldset>
  <div
    v-if="props.isEditable"
    class="flex space-x-10 mt-5"
  >
    <DsfrButton
      label="Ajouter l'environnement"
      data-testid="addEnvironmentBtn"
      primary
      icon="ri-upload-cloud-line"
      @click="addEnvironment()"
    />
    <DsfrButton
      label="Annuler"
      data-testid="cancelEnvironmentBtn"
      secondary
      icon="ri-close-line"
      @click="cancel()"
    />
  </div>
</template>