<script setup>
import { ref, onMounted } from 'vue'
import { environmentSchema, schemaValidator, instanciateSchema } from 'shared'
import { allEnv } from 'shared/src/utils/iterables.js'
import PermissionForm from './PermissionForm.vue'

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

const environmentToDelete = ref('')

const isDeletingEnvironment = ref(false)

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

const emit = defineEmits([
  'addEnvironment',
  'cancel',
  'deleteEnvironment',
])

const addEnvironment = () => {
  updatedValues.value = instanciateSchema({ schema: environmentSchema }, true)
  const errorSchema = schemaValidator(environmentSchema, localEnvironment.value)

  if (Object.keys(errorSchema).length === 0) {
    emit('addEnvironment', localEnvironment.value)
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
      v-if="props.isEditable"
      v-model="localEnvironment.name"
      data-testid="environmentNameSelect"
      label="Nom de l'environnement"
      required="required"
      :disabled="!props.isEditable"
      :options="environmentOptions"
      @update:model-value="updateEnvironment('name', $event)"
    />
  </DsfrFieldset>
  <div v-if="localEnvironment.id">
    <div class="fr-my-2w fr-py-4w fr-px-1w border-solid border-1 rounded-sm border-red-500">
      <div class="flex justify-between items-center <md:flex-col">
        <DsfrButton
          v-show="!isDeletingEnvironment"
          :label="`Supprimer l'environnement ${localEnvironment.name}`"
          secondary
          icon="ri-delete-bin-7-line"
          @click="isDeletingEnvironment = true"
        />
        <DsfrAlert
          class="<md:mt-2"
          description="La suppression d'un environnement est irréversible."
          type="warning"
          small
        />
      </div>
      <div
        v-if="isDeletingEnvironment"
        class="fr-mt-4w"
      >
        <DsfrInput
          v-model="environmentToDelete"
          :label="`Veuillez taper '${localEnvironment.name}' pour confirmer la suppression de l'environnement`"
          label-visible
          :placeholder="localEnvironment.name"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            :label="`Supprimer définitivement l'environnement ${localEnvironment.name}`"
            :disabled="environmentToDelete !== localEnvironment.name"
            secondary
            icon="ri-delete-bin-7-line"
            @click="$emit('deleteEnvironment', localEnvironment)"
          />
          <DsfrButton
            label="Annuler"
            primary
            @click="isDeletingEnvironment = false"
          />
        </div>
      </div>
    </div>
    <PermissionForm
      v-if="!isDeletingEnvironment"
      :environment="localEnvironment"
    />
  </div>
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
