<script lang="ts" setup>
import { ref, onBeforeMount, watch, computed } from 'vue'
import { getRandomId } from '@gouvminint/vue-dsfr'
import { EnvironmentSchema, projectIsLockedInfo, longestEnvironmentName, type QuotaStageModel, type QuotaModel, type SharedZodError, parseZodError } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'

type Cluster = {
  id: string
  label: string
  infos: string
}

type Stage = {
  id: string
  name: string
  clusters: Cluster[]
  quotaStage: QuotaStageModel[]
}

type OptionType = {
    text: string,
    value: string,
  }

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
const quotas = ref<QuotaModel[]>([])
const allStages = ref<Stage[]>([])
const inputKey = ref(getRandomId('input'))
const stageId = ref<string>()
const quotaId = ref<string>()
const stageOptions = ref<OptionType[]>([])
const quotaOptions = ref<OptionType[]>([])
const clusterOptions = ref<OptionType[]>([])

const stage = computed(() => allStages.value.find(allStage => allStage.id === stageId.value))

const errorSchema = computed<SharedZodError | undefined>(() => {
  let schemaValidation
  if (localEnvironment.value.id) {
    schemaValidation = EnvironmentSchema.safeParse(localEnvironment.value)
  } else {
    schemaValidation = EnvironmentSchema.omit({ id: true, permissions: true }).safeParse(localEnvironment.value)
  }
  return schemaValidation.success ? undefined : schemaValidation.error
})

// @ts-ignore
const availableClusters: ComputedRef<Cluster[]> = computed(() => {
  let clusters = props.projectClusters
    ?.filter(
      projectCluster => stage.value?.clusters
        ?.map(cluster => cluster.id)
        // @ts-ignore
        ?.includes(projectCluster.id),
    )

  if (
    localEnvironment.value.clusterId &&
    !clusters
    // @ts-ignore
      ?.find(availableCluster => availableCluster?.id === localEnvironment.value.clusterId)
  ) {
    clusters = [
      ...clusters, props.allClusters
      // @ts-ignore
        ?.find(cFromAll => cFromAll?.id === localEnvironment.value.clusterId),
    ]
  }
  return clusters
})

const clusterInfos = computed(() => availableClusters.value.find(cluster => cluster.id === localEnvironment.value.clusterId)?.infos)

const setEnvironmentOptions = () => {
  stageOptions.value = allStages.value.map(stage => ({
    text: stage.name,
    value: stage.id,
  }))
}

const setClusterOptions = () => {
  clusterOptions.value = availableClusters.value.map(cluster => ({
    // @ts-ignore
    text: cluster.label,
    // @ts-ignore
    value: cluster.id,
  }))
}

const setQuotaOptions = () => {
  if (stage.value) {
    // @ts-ignore
    quotaOptions.value = stage.value.quotaStage
    // @ts-ignore
      .reduce((acc: OptionType[], curr: QuotaStageModel) => {
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
}

const addEnvironment = () => {
  if (!errorSchema.value) {
    emit('addEnvironment', localEnvironment.value)
  } else {
    snackbarStore.setMessage(parseZodError(errorSchema.value))
  }
}

const putEnvironment = () => {
  if (!errorSchema.value) {
    emit('putEnvironment', localEnvironment.value)
  } else {
    snackbarStore.setMessage(parseZodError(errorSchema.value))
  }
}

const cancel = () => {
  emit('cancel')
}

onBeforeMount(async () => {
  quotas.value = await projectEnvironmentStore.getQuotas()
  allStages.value = await projectEnvironmentStore.getStages()
  setEnvironmentOptions()

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
  localEnvironment.value.quotaStageId = stage.value?.quotaStage.find(qs => qs.quotaId === quotaId.value)?.id
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
        :required="true"
        :hint="`Ne doit pas contenir d'espace ni de trait d'union, doit être unique pour le projet et le cluster sélectionnés, être en minuscules et faire plus de 2 et moins de ${longestEnvironmentName} caractères.`"
        :error-message="!!localEnvironment.name && !EnvironmentSchema.pick({name: true}).safeParse({name: localEnvironment.name}).success ? `Le nom de l\'environnment ne doit pas contenir d\'espace, doit être unique pour le projet et le cluster sélectionnés, être en minuscules et faire plus de 2 et moins de ${longestEnvironmentName} caractères.`: undefined"
        placeholder="integ0"
        :disabled="!props.isEditable"
      />
      <DsfrSelect
        v-model="stageId"
        select-id="stage-select"
        label="Type d'environnement"
        description="Type d'environnement proposé par DSO, conditionne les quotas et les clusters auxquels vous aurez accès pour créer votre environnement."
        required
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
            required
            :options="quotaOptions"
          />
        </div>
        <DsfrAlert
          v-if="stageId && !clusterOptions?.length"
          data-testid="noClusterOptionAlert"
          description="Aucun cluster ne semble disponible pour votre projet et le type d'environnement choisi. Veuillez contacter les administrateurs."
          type="warning"
          small
        />
        <DsfrSelect
          v-if="stageId && clusterOptions?.length"
          v-model="localEnvironment.clusterId"
          select-id="cluster-select"
          label="Cluster"
          :description="`Choix du cluster cible pour le déploiement de l\'environnement ${localEnvironment.name ? localEnvironment.name : 'en cours de création'}.`"
          required
          :disabled="!props.isEditable"
          :options="clusterOptions"
        />
        <DsfrAlert
          v-if="clusterInfos"
          data-testid="clusterInfos"
          title="Informations du cluster"
          :description="clusterInfos"
        />
        <div
          v-if="localEnvironment.id"
          class="flex space-x-10 mt-5"
        >
          <DsfrButton
            label="Enregistrer"
            data-testid="putEnvironmentBtn"
            :disabled="props.isProjectLocked || !!errorSchema"
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
        :disabled="props.isProjectLocked || !!errorSchema"
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
      v-if="snackbarStore.isWaitingForResponse"
      description="Opérations en cours sur l'environnement"
    />
  </div>
</template>
