<script lang="ts" setup>
import { ref, onMounted, onBeforeMount, type Ref, watch } from 'vue'
import { environmentSchema, schemaValidator, instanciateSchema, projectIsLockedInfo } from '@dso-console/shared'
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
  allDsoEnvironments: {
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
const environmentName = ref(undefined)
const quotaLevels = ref([])

const setEnvironmentOptions = () => {
  const availableEnvironments = props.environmentNames.length
    ? props.allDsoEnvironments
      .filter(dsoEnv => !props.environmentNames
        //  @ts-ignore
        .includes(dsoEnv.name))
    //  @ts-ignore
      .map(dsoEnv => dsoEnv.name)
    : props.allDsoEnvironments
      //  @ts-ignore
      .map(dsoEnv => dsoEnv.name)
  //  @ts-ignore
  environmentOptions.value = availableEnvironments.map(env => ({
    text: env,
    value: env,
  }))
}

const updateEnvironment = (key: string, value: any) => {
  localEnvironment.value[key] = value
  //  @ts-ignore
  updatedValues.value[key] = true

  /**
    * Retrieve array of cluster labels from child component, map it into array of cluster ids.
    */
  if (key === 'clustersId') {
    localEnvironment.value.clustersId = localEnvironment.value.clustersId
      //  @ts-ignore
      .map(cluster => props.projectClusters
        //  @ts-ignore
        ?.find(projectCluster => projectCluster.label === cluster).id)
  }

  if (key === 'name') {
    getQuotaLevels()
  }
}

const emit = defineEmits([
  'addEnvironment',
  'putEnvironment',
  'deleteEnvironment',
  'cancel',
])

const getQuotaLevels = () => {
  // @ts-ignore
  quotaLevels.value = quotas.value
    .filter(quota => quota.allowedEnvIds
    // @ts-ignore
      .map(allowedEnvId => props.allDsoEnvironments
      // @ts-ignore
        .find(dsoEnv => dsoEnv.id === allowedEnvId)?.name)
      .includes(environmentName.value))
    .map(quota => quota.flavor + ' : ' + quota.compute)
  inputKey.value = getRandomId('input')
}

const pickQuotas = (value: number) => {
  localEnvironment.value.quotaId = quotas.value[value]?.id
}

const addEnvironment = () => {
  /**
    * turn environmentName into corresponding dsoEnvironmentId
    */
  //  @ts-ignore
  localEnvironment.value.dsoEnvironmentId = props.allDsoEnvironments.find(dsoEnv => dsoEnv.name === environmentName.value).id
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
    * Receive array of cluster ids from parent component, map it into array of cluster labels.
    */
  localEnvironment.value = props.environment
  clustersLabel.value = localEnvironment.value.clustersId
    //  @ts-ignore
    ?.map(clusterId => props.projectClusters
      //  @ts-ignore
      ?.find(projectCluster => projectCluster.id === clusterId).label)

  /**
    * Receive dsoEnvironmentId from parent component, turn it into environmentName.
    */
  if (localEnvironment.value.dsoEnvironmentId) {
    //  @ts-ignore
    environmentName.value = props.allDsoEnvironments?.find(dsoEnv => dsoEnv.id === localEnvironment.value.dsoEnvironmentId)?.name
  }

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

  // Restrict quota level choice according to selected environment
  if (environmentName.value) getQuotaLevels()
})

onMounted(() => {
  setEnvironmentOptions()
})

watch(environmentName, () => {
  getQuotaLevels()
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
      :legend="`Informations de l\'environnement ${localEnvironment.id ? `de ${environmentName}` : ''}`"
      :hint="props.isEditable ? 'Les champs munis d\'une astérisque (*) sont requis' : undefined"
      data-testid="environmentFieldset"
    >
      <DsfrSelect
        v-if="props.isEditable"
        v-model="environmentName"
        select-id="environment-name-select"
        label="Nom de l'environnement"
        required="required"
        :disabled="!props.isEditable"
        :options="environmentOptions"
      />
      <div class="fr-mb-2w">
        <RangeInput
          v-if="environmentName"
          :key="inputKey"
          data-testid="quotasLevelRange"
          class="my-4"
          label="Dimensionnement des ressources allouées à l'environnement"
          :level="quotaRange"
          :levels="quotaLevels"
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
        :environment-name="environmentName"
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
            :label="`Supprimer l'environnement ${environmentName}`"
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
            :label="`Veuillez taper '${environmentName}' pour confirmer la suppression de l'environnement`"
            label-visible
            :placeholder="environmentName"
            class="fr-mb-2w"
          />
          <div
            class="flex justify-between"
          >
            <DsfrButton
              data-testid="deleteEnvironmentBtn"
              :label="`Supprimer définitivement l'environnement ${environmentName}`"
              :disabled="environmentToDelete !== environmentName"
              :title="`Supprimer définitivement l'environnement ${environmentName}`"
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
      v-if="props.isUpdatingEnvironment"
      description="Opérations en cours sur l'environnement"
    />
  </div>
</template>
