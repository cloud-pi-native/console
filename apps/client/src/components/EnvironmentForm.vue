<script lang="ts" setup>
import { ref, onMounted, onBeforeMount, type Ref } from 'vue'
import { environmentSchema, schemaValidator, instanciateSchema, allEnv, projectIsLockedInfo } from '@dso-console/shared'
import PermissionForm from './PermissionForm.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import MultiSelector from './MultiSelector.vue'
import LoadingCt from './LoadingCt.vue'
import RangeInput from './RangeInput.vue'
import { getRandomId } from '@gouvminint/vue-dsfr'

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
  isOwner: {
    type: Boolean,
    default: false,
  },
  isProjectLocked: {
    type: Boolean,
    default: false,
  },
  projectClusters: {
    type: Array,
    default: () => [],
  },
  isUpdatingEnvironment: {
    type: Boolean,
    default: false,
  },
})

const snackbarStore = useSnackbarStore()
const projectEnvironmentStore = useProjectEnvironmentStore()

const clustersLabel = ref([])
const localEnvironment = ref(props.environment)
const updatedValues = ref({})
const environmentOptions = ref([])
const environmentToDelete = ref('')
const isDeletingEnvironment = ref(false)
const quotas: Ref<Array<any>> = ref([])
const inputKey = ref(getRandomId('input'))
const quotaRange = ref(0)

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

  /**
    * Retrieve array of cluster labels from child component, map it into array of cluster ids.
    */
  if (key === 'clustersId') {
    localEnvironment.value.clustersId = localEnvironment.value.clustersId
      .map(cluster => props.projectClusters
        ?.find(projectCluster => projectCluster.label === cluster).id)
  }
}

const emit = defineEmits([
  'addEnvironment',
  'putEnvironment',
  'deleteEnvironment',
  'cancel',
])

// Restrict quota level choice according to selected environment
const getQuotaLevels = () => {
  return quotas.value.filter(quota => quota.allowedEnvs.includes(localEnvironment.value.name)).map(quota => quota.flavor + ' : ' + quota.compute)
}

const pickQuotas = (value: number) => {
  localEnvironment.value.quotaId = quotas.value[value]?.id
}

const addEnvironment = () => {
  updatedValues.value = instanciateSchema({ schema: environmentSchema }, true)
  const errorSchema = schemaValidator(environmentSchema, localEnvironment.value)

  if (Object.keys(errorSchema).length === 0) {
    emit('addEnvironment', localEnvironment.value)
  } else {
    snackbarStore.setMessage(Object.values(errorSchema)[0])
  }
}

const putEnvironment = () => {
  delete localEnvironment.value.clusters
  updatedValues.value = instanciateSchema({ schema: environmentSchema }, true)
  const errorSchema = schemaValidator(environmentSchema, localEnvironment.value)

  if (Object.keys(errorSchema).length === 0) {
    emit('putEnvironment', localEnvironment.value)
  } else {
    snackbarStore.setMessage(Object.values(errorSchema)[0])
  }
}

const cancel = () => {
  emit('cancel')
}

onBeforeMount(async () => {
  /**
    * Retrieve array of cluster ids from parent component, map it into array of cluster labels and pass it to child component.
    */
  localEnvironment.value = props.environment
  clustersLabel.value = localEnvironment.value.clustersId?.map(clusterId => props.projectClusters
    ?.find(projectCluster => projectCluster.id === clusterId).label)

  // Retrieve quotas
  try {
    quotas.value = await projectEnvironmentStore.getQuotas()
  } catch (error) {
    if (error instanceof Error) {
      return snackbarStore.setMessage(error.message)
    }
    snackbarStore.setMessage('Erreur de récupération des quotas')
  }

  // Set default quota to minimum
  if (!localEnvironment.value.quotaId) {
    localEnvironment.value.quotaId = quotas.value?.find(quota => quota?.flavor === 'micro').id
  }
  quotaRange.value = quotas.value.findIndex(quota => quota.id === localEnvironment.value.quotaId)
  inputKey.value = getRandomId('input')
})

onMounted(() => {
  setEnvironmentOptions()
})

</script>

<template>
  <div
    class="relative"
  >
    <h1
      v-if="props.isEditable"
      class="fr-h1"
    >
      Ajouter un environnement au projet
    </h1>
    <DsfrFieldset
      :key="environment"
      :legend="`Informations de l\'environnement ${localEnvironment.id ? `de ${localEnvironment.name}` : ''}`"
      :hint="props.isEditable ? 'Les champs munis d\'une astérisque (*) sont requis' : undefined"
      data-testid="environmentFieldset"
    >
      <DsfrSelect
        v-if="props.isEditable"
        v-model="localEnvironment.name"
        select-id="environment-name-select"
        label="Nom de l'environnement"
        required="required"
        :disabled="!props.isEditable"
        :options="environmentOptions"
        @update:model-value="updateEnvironment('name', $event)"
      />
      <div class="fr-mb-2w">
        <RangeInput
          v-if="localEnvironment.name"
          :key="inputKey"
          data-testid="quotasLevelRange"
          class="my-4"
          label="Dimensionnement des ressources allouées à l'environnement"
          :level="quotaRange"
          :levels="getQuotaLevels()"
          required="required"
          @update-level="$event => pickQuotas($event)"
        />
        <p class="fr-hint-text">
          Si votre projet nécessite d'avantage de ressources que celles proposées ci-dessus, contactez les administrateurs : <a href="mailto:cloudpinative@interieur.gouv.fr?subject=Demande de dépassement de quotas">cloudpinative@interieur.gouv.fr</a>.
        </p>
        <MultiSelector
          :options="projectClusters"
          :array="clustersLabel"
          :disabled="props.isProjectLocked || !projectClusters.length"
          choice-label="Veuillez choisir un ou plusieurs cluster"
          no-choice-label="Aucun cluster disponible pour ce projet"
          label="Nom du cluster"
          description="Ajouter un cluster cible pour le déploiement de cet environnement."
          @update="updateEnvironment('clustersId', $event)"
        />
        <div
          v-if="localEnvironment.id"
          class="flex space-x-10 mt-5"
        >
          <DsfrButton
            label="Enregistrer"
            data-testid="putEnvironmentBtn"
            :disabled="props.isProjectLocked"
            :title="props.isProjectLocked ? projectIsLockedInfo : 'Enregistrer les changements'"
            primary
            icon="ri-upload-cloud-line"
            @click="putEnvironment()"
          />
          <DsfrButton
            label="Annuler"
            data-testid="cancelEnvironmentBtn"
            :disabled="props.isProjectLocked"
            secondary
            icon="ri-close-line"
            @click="cancel()"
          />
        </div>
      </div>
    </DsfrFieldset>
    <div v-if="localEnvironment.id">
      <PermissionForm
        v-if="!isDeletingEnvironment"
        :environment="localEnvironment"
      />
      <div
        v-if="isOwner"
        data-testid="deleteEnvironmentZone"
        class="danger-zone"
      >
        <div class="danger-zone-btns">
          <DsfrButton
            v-show="!isDeletingEnvironment"
            data-testid="showDeleteEnvironmentBtn"
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
            data-testid="deleteEnvironmentInput"
            :label="`Veuillez taper '${localEnvironment.name}' pour confirmer la suppression de l'environnement`"
            label-visible
            :placeholder="localEnvironment.name"
            class="fr-mb-2w"
          />
          <div
            class="flex justify-between"
          >
            <DsfrButton
              data-testid="deleteEnvironmentBtn"
              :label="`Supprimer définitivement l'environnement ${localEnvironment.name}`"
              :disabled="environmentToDelete !== localEnvironment.name"
              :title="`Supprimer définitivement l'environnement ${localEnvironment.name}`"
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
    </div>
    <div
      v-if="props.isEditable"
      class="flex space-x-10 mt-5"
    >
      <DsfrButton
        label="Ajouter l'environnement"
        data-testid="addEnvironmentBtn"
        :disabled="props.isProjectLocked"
        :title="props.isProjectLocked ? projectIsLockedInfo : 'Ajouter l\'environnement'"
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
    <LoadingCt
      :show-loader="props.isUpdatingEnvironment"
      description="Opérations en cours sur l'environnement"
    />
  </div>
</template>
