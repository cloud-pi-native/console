<script lang="ts" setup>
import { ref, onBeforeMount, type Ref, watch, computed } from 'vue'
import { environmentSchema, schemaValidator, projectIsLockedInfo, isValid, longestEnvironmentName, type QuotaStageModel } from '@dso-console/shared'
import PermissionForm from './PermissionForm.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import LoadingCt from './LoadingCt.vue'
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
  allClusters: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'addEnvironment',
  'putEnvironment',
  'deleteEnvironment',
  'cancel',
])

const snackbarStore = useSnackbarStore()
const projectEnvironmentStore = useProjectEnvironmentStore()

const localEnvironment = ref(props.environment)
const environmentToDelete = ref('')
const isDeletingEnvironment = ref(false)
const quotas: Ref<Array<any>> = ref([])
const allStages: Ref<Array<any>> = ref([])
const inputKey = ref(getRandomId('input'))
const stageId = ref(undefined)
const quotaId = ref(undefined)
const stageOptions: Ref<Array<any>> = ref([])
const quotaOptions: Ref<Array<any>> = ref([])
const clusterOptions: Ref<Array<any>> = ref([])

const stage = computed(() => allStages.value.find(allStage => allStage.id === stageId.value))

const errorSchema = computed(() => schemaValidator(environmentSchema, localEnvironment.value))

const setEnvironmentOptions = () => {
  stageOptions.value = allStages.value.map(stage => ({
    text: stage.name,
    value: stage.id,
  }))
}

const setClusterOptions = () => {
  let availableClusters = props.projectClusters
    ?.filter(projectCluster => stage.value?.clusters
    // @ts-ignore
      ?.map(cluster => cluster.id)
    // @ts-ignore
      ?.includes(projectCluster.id),
    )

  if (
    localEnvironment.value.clusterId &&
    !availableClusters
      ?.find(availableCluster => availableCluster?.id === localEnvironment.value.clusterId)
  ) {
    availableClusters = [
      ...availableClusters, props.allClusters
        ?.find(cFromAll => cFromAll?.id === localEnvironment.value.clusterId),
    ]
  }

  clusterOptions.value = availableClusters.map(cluster => ({
    // @ts-ignore
    text: cluster.label,
    // @ts-ignore
    value: cluster.id,
  }))
}

type QuotaOptionType = {
    text: string,
    value: string,
  }

const setQuotaOptions = () => {
  quotaOptions.value = stage.value?.quotaStage
    ?.reduce((acc: QuotaOptionType[], curr: QuotaStageModel) => {
      const matchingQuota = quotas.value
        ?.find(quota => quota.id === curr.quotaId)
      return matchingQuota
        ? [...acc, {
            text: matchingQuota.name + ' (' + matchingQuota.cpu + 'CPU, ' + matchingQuota.memory + ')',
            value: matchingQuota.id,
          }]
        : acc
    }, [])
  inputKey.value = getRandomId('input')
}

const addEnvironment = () => {
  if (Object.keys(errorSchema.value).length === 0) {
    emit('addEnvironment', localEnvironment.value)
  } else {
    snackbarStore.setMessage(Object.values(errorSchema)[0])
  }
}

const putEnvironment = () => {
  if (Object.keys(errorSchema.value).length === 0) {
    emit('putEnvironment', localEnvironment.value)
  } else {
    snackbarStore.setMessage(Object.values(errorSchema)[0])
  }
}

const cancel = () => {
  emit('cancel')
}

onBeforeMount(async () => {
  try {
    quotas.value = await projectEnvironmentStore.getQuotas()
    allStages.value = await projectEnvironmentStore.getStages()
    setEnvironmentOptions()
  } catch (error) {
    if (error instanceof Error) {
      return snackbarStore.setMessage(error.message)
    }
    snackbarStore.setMessage('Erreur de récupération des quotas')
  }

  // Receive quotaStage from parent component, retrieve stageId and quotaId
  if (localEnvironment.value.quotaStage) {
    stageId.value = localEnvironment.value.quotaStage.stageId
    quotaId.value = localEnvironment.value.quotaStage.quotaId
  }

  // Restrict quota level choice according to selected environment
  if (stageId.value) {
    setQuotaOptions()
    setClusterOptions()
  }
})

watch(stageId, () => {
  setQuotaOptions()
  setClusterOptions()
})

watch(quotaId, () => {
  // Turn stageId and quotaId into corresponding quotaStageId
  // @ts-ignore
  localEnvironment.value.quotaStageId = stage.value.quotaStage.find(qs => qs.quotaId === quotaId.value)?.id
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
      :legend="`Informations de l\'environnement ${localEnvironment.name ?? ''}`"
      :hint="props.isEditable ? 'Les champs munis d\'une astérisque (*) sont requis' : undefined"
      data-testid="environmentFieldset"
    >
      <DsfrInput
        v-model="localEnvironment.name"
        data-testid="environmentNameInput"
        class="fr-my-2w"
        label="Nom de l'environnement"
        label-visible
        required="required"
        :hint="`Ne doit pas contenir d'espace, doit être unique pour le projet et le cluster sélectionnés, être en minuscules et faire plus de 2 et moins de ${longestEnvironmentName} caractères.`"
        :error-message="!!localEnvironment.name && !isValid(environmentSchema, localEnvironment, 'name') ? `Le nom de l\'environnment ne doit pas contenir d\'espace, doit être unique pour le projet et le cluster sélectionnés, être en minuscules et faire plus de 2 et moins de ${longestEnvironmentName} caractères.`: undefined"
        placeholder="integ-0"
        :disabled="!props.isEditable"
      />
      <DsfrSelect
        v-model="stageId"
        select-id="stage-select"
        label="Stage"
        description="Stage proposé par DSO, conditionne les quotas et les clusters disponibles pour l'environnement."
        required="required"
        :disabled="!props.isEditable"
        :options="stageOptions"
      />
      <div class="fr-mb-2w">
        <div
          v-if="stageId"
          class="fr-my-2w"
        >
          <DsfrAlert
            v-if="quotaId && !quotaOptions.find(quota => quota.value === quotaId)"
            description="Vous disposez d'un quota privé pour cet environnement. Veuillez contacter un administrateur si vous souhaitez le modifier."
            small
          />
          <DsfrSelect
            v-else
            :key="inputKey"
            v-model="quotaId"
            select-id="quota-select"
            label="Dimensionnement des ressources allouées à l'environnement"
            description="Si votre projet nécessite d'avantage de ressources que celles proposées ci-dessus, contactez les administrateurs."
            required="required"
            :options="quotaOptions"
          />
        </div>
        <DsfrAlert
          v-if="stageId && !clusterOptions?.length"
          data-testid="noClusterOptionAlert"
          description="Aucun cluster ne semble disponible pour votre projet et le stage choisi. Veuillez contacter les administrateurs."
          type="warning"
          small
        />
        <DsfrSelect
          v-if="stageId && clusterOptions?.length"
          v-model="localEnvironment.clusterId"
          select-id="cluster-select"
          label="Cluster"
          :description="`Choix du cluster cible pour le déploiement de l\'environnement ${localEnvironment.name ? localEnvironment.name : 'en cours de création'}.`"
          required="required"
          :disabled="!props.isEditable"
          :options="clusterOptions"
        />
        <div
          v-if="localEnvironment.id"
          class="flex space-x-10 mt-5"
        >
          <DsfrButton
            label="Enregistrer"
            data-testid="putEnvironmentBtn"
            :disabled="props.isProjectLocked || !!Object.keys(errorSchema).length"
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
        :disabled="props.isProjectLocked || !!Object.keys(errorSchema).length"
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
