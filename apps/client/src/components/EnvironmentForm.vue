<script lang="ts" setup>
import type {
  CleanedCluster,
  Environment,
  SharedZodError,
} from '@cpn-console/shared'
import { useQuotaStore } from '@/stores/quota.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useStageStore } from '@/stores/stage.js'
import { useZoneStore } from '@/stores/zone.js'
import {
  EnvironmentSchema,
  longestEnvironmentName,
  parseZodError,
  projectIsLockedInfo,
} from '@cpn-console/shared'
import { computed, onBeforeMount, ref } from 'vue'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'

interface OptionType {
  text: string
  value: string
}

const props = withDefaults(defineProps<{
  environment?: Omit<Environment, 'projectId'>
  isEditable: boolean
  canManage: boolean
  isProjectLocked: boolean
  projectClustersIds: CleanedCluster['id'][]
  allClusters: CleanedCluster[]
}>(), {
  // @ts-expect-error TS2322
  environment: () => ({
    id: '',
    name: '',
    stageId: undefined,
    quotaId: undefined,
    clusterId: undefined,
  }),
  isEditable: true,
  canManage: false,
  isProjectLocked: false,
})

const emit = defineEmits<{
  addEnvironment: [environment: Omit<Environment, 'id' | 'projectId'>]
  putEnvironment: [environment: Pick<Environment, 'quotaId'>]
  deleteEnvironment: [environmentId: Environment['id']]
  cancel: []
}>()

const snackbarStore = useSnackbarStore()
const stageStore = useStageStore()
const quotaStore = useQuotaStore()
const zoneStore = useZoneStore()

const localEnvironment = ref(props.environment)
const environmentToDelete = ref('')
const isDeletingEnvironment = ref(false)
const inputKey = ref(getRandomId('input'))
const zoneId = ref<string>()
const stageOptions = ref<OptionType[]>([])
const zoneOptions = ref<OptionType[]>([])
const quotaOptions = ref<OptionType[]>([])
const clusterOptions = ref<OptionType[]>([])

const chosenZoneDescription = computed(() => zoneStore.zonesById[zoneId.value ?? '']?.description ?? '')

const errorSchema = computed<SharedZodError | undefined>(() => {
  if (localEnvironment.value?.id) {
    const schemaValidation = EnvironmentSchema.pick({ id: true, quotaId: true }).safeParse(localEnvironment.value)
    return schemaValidation.success ? undefined : schemaValidation.error
  } else {
    const schemaValidation = EnvironmentSchema.pick({ clusterId: true, name: true, quotaId: true, stageId: true }).safeParse(localEnvironment.value)
    return schemaValidation.success ? undefined : schemaValidation.error
  }
})

const availableClusters: ComputedRef<CleanedCluster[]> = computed(() => props.allClusters
  .filter(cluster => props.projectClustersIds.includes(cluster.id))
  .filter(cluster => cluster.zoneId === zoneId.value)
  .filter(cluster => cluster.stageIds.includes(localEnvironment.value.stageId ?? '')),
)

const clusterInfos = computed(() => availableClusters.value.find(cluster => cluster.id === localEnvironment.value.clusterId)?.infos)

function setEnvironmentOptions() {
  stageOptions.value = stageStore.stages.map(stage => ({
    text: stage.name,
    value: stage.id,
  }))
  zoneOptions.value = zoneStore.zones.map(zone => ({
    text: zone.label,
    value: zone.id,
  }))
  clusterOptions.value = props.allClusters
    .filter(cluster =>
      (props.projectClustersIds.includes(cluster.id) // clusters possibles pour ce projet
        && cluster.stageIds.includes(localEnvironment.value.stageId ?? '') // correspondant à ce stage
        && cluster.zoneId === zoneId.value) // dont la zone d'attachement est celle choisie
        || cluster.id === localEnvironment.value.clusterId, // ou alors celui associé à l'environnment en cours de modification
    )
    .map(cluster => ({
      text: cluster.label,
      value: cluster.id,
    }))
  quotaOptions.value
    = quotaStore.quotas
      .filter(quota =>
        (quota.stageIds.includes(localEnvironment.value.stageId ?? '') // quotas disponibles pour ce type d'environnement
          && !quota.isPrivate) // et ne pas afficher les quotas privés
          || quota.id === localEnvironment.value.quotaId) // ou quota actuellement associé (au cas où l'association ne soit plus disponible)
      .map(quota => ({
        text: `${quota.name} (${quota.cpu}CPU, ${quota.memory})`,
        value: quota.id,
      }))
}

function resetCluster() {
  // @ts-expect-error TS2322
  localEnvironment.value.clusterId = undefined
}

function addEnvironment() {
  if (!errorSchema.value) {
    emit('addEnvironment', localEnvironment.value)
  } else {
    snackbarStore.setMessage(parseZodError(errorSchema.value))
  }
}

function putEnvironment() {
  if (!errorSchema.value) {
    emit('putEnvironment', localEnvironment.value)
  } else {
    snackbarStore.setMessage(parseZodError(errorSchema.value))
  }
}

function cancel() {
  emit('cancel')
}

onBeforeMount(async () => {
  await Promise.all([
    stageStore.getAllStages(),
    quotaStore.getAllQuotas(),
    zoneStore.getAllZones(),
  ])
  setEnvironmentOptions()
})

onMounted(() => {
  zoneId.value = props.allClusters?.find(cluster => cluster.id === localEnvironment.value.clusterId)?.zoneId
})

watch(zoneId, () => {
  setEnvironmentOptions()
})

watch(localEnvironment.value, () => {
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
      :legend="`Informations de l\'environnement ${localEnvironment.name ?? ''}`"
      :hint="props.isEditable ? 'Les champs munis d\'une astérisque (*) sont requis' : undefined"
      data-testid="environmentFieldset"
    >
      <DsfrInputGroup
        v-model="localEnvironment.name"
        data-testid="environmentNameInput"
        class="fr-my-2w"
        label="Nom de l'environnement"
        label-visible
        :required="true"
        :hint="`Ne doit pas contenir d'espace ni de trait d'union, doit être unique pour le projet et le cluster sélectionnés, être en minuscules et faire plus de 2 et moins de ${longestEnvironmentName} caractères.`"
        :error-message="!!localEnvironment.name && !EnvironmentSchema.pick({ name: true }).safeParse({ name: localEnvironment.name }).success ? `Le nom de l\'environnment ne doit pas contenir d\'espace, doit être unique pour le projet et le cluster sélectionnés, être en minuscules et faire plus de 2 et moins de ${longestEnvironmentName} caractères.` : undefined"
        placeholder="integ0"
        :disabled="!props.isEditable || !props.canManage"
      />
      <DsfrSelect
        v-model="zoneId"
        select-id="zone-select"
        label="Zone"
        :description="`Choix de la zone cible pour le déploiement de l\'environnement ${localEnvironment.name ? localEnvironment.name : 'en cours de création'}.`"
        required
        :disabled="!props.isEditable || !props.canManage"
        :options="zoneOptions"
        @update:model-value="resetCluster()"
      />
      <DsfrAlert
        v-if="chosenZoneDescription"
        data-testid="chosenZoneDescription"
        class="my-4"
        title="À propos de la zone"
        :description="chosenZoneDescription"
      />
      <DsfrSelect
        v-model="localEnvironment.stageId"
        select-id="stage-select"
        label="Type d'environnement"
        description="Type d'environnement proposé par DSO, conditionne les quotas et les clusters auxquels vous aurez accès pour créer votre environnement."
        required
        :disabled="!props.isEditable || !props.canManage"
        :options="stageOptions"
        @update:model-value="resetCluster()"
      />
      <div class="fr-mb-2w">
        <div
          v-if="localEnvironment.stageId"
          class="fr-my-2w"
        >
          <DsfrAlert
            v-if="localEnvironment.quotaId && quotaStore.quotasById[localEnvironment.quotaId]?.isPrivate"
            description="Vous disposez d'un quota privé pour cet environnement. Veuillez contacter un administrateur si vous souhaitez le modifier."
            small
          />
          <DsfrSelect
            :key="inputKey"
            v-model="localEnvironment.quotaId"
            select-id="quota-select"
            label="Dimensionnement des ressources allouées à l'environnement"
            description="Si votre projet nécessite d'avantage de ressources que celles proposées ci-dessus, contactez les administrateurs."
            required
            :options="quotaOptions"
            :disabled="!!(localEnvironment.quotaId && quotaStore.quotasById[localEnvironment.quotaId]?.isPrivate) || !props.canManage"
          />
        </div>
        <DsfrAlert
          v-if="localEnvironment.stageId && zoneId && !clusterOptions.length"
          data-testid="noClusterOptionAlert"
          description="Aucun cluster ne semble disponible pour votre projet, la zone et le type d'environnement choisis. Veuillez contacter les administrateurs."
          type="warning"
          small
        />
        <DsfrSelect
          v-if="localEnvironment.stageId && zoneId && clusterOptions?.length"
          v-model="localEnvironment.clusterId"
          select-id="cluster-select"
          label="Cluster"
          :description="`Choix du cluster cible pour le déploiement de l\'environnement ${localEnvironment.name ? localEnvironment.name : 'en cours de création'}.`"
          required
          :disabled="!props.isEditable || !props.canManage"
          :options="clusterOptions"
        />
        <DsfrAlert
          v-if="clusterInfos"
          data-testid="clusterInfos"
          title="À propos du cluster"
          :description="clusterInfos"
        />
        <div
          v-if="localEnvironment.id && canManage"
          class="flex space-x-10 mt-5"
        >
          <DsfrButton
            label="Enregistrer"
            data-testid="putEnvironmentBtn"
            :disabled="props.isProjectLocked || !!errorSchema"
            :title="props.isProjectLocked ? projectIsLockedInfo : 'Enregistrer les changements'"
            primary
            icon="ri:upload-cloud-line"
            @click="putEnvironment()"
          />
          <DsfrButton
            label="Annuler"
            data-testid="cancelEnvironmentBtn"
            secondary
            icon="ri:close-line"
            @click="cancel()"
          />
        </div>
      </div>
    </DsfrFieldset>
    <div v-if="localEnvironment.id">
      <div
        v-if="canManage"
        data-testid="deleteEnvironmentZone"
        class="danger-zone"
      >
        <div class="danger-zone-btns">
          <DsfrButton
            v-show="!isDeletingEnvironment"
            data-testid="showDeleteEnvironmentBtn"
            :label="`Supprimer l'environnement ${localEnvironment.name}`"
            secondary
            :disabled="props.isProjectLocked"
            icon="ri:delete-bin-7-line"
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
              icon="ri:delete-bin-7-line"
              @click="emit('deleteEnvironment', localEnvironment.id)"
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
      v-if="props.isEditable && canManage"
      class="flex space-x-10 mt-5"
    >
      <DsfrButton
        label="Ajouter l'environnement"
        data-testid="addEnvironmentBtn"
        :disabled="props.isProjectLocked || !!errorSchema"
        :title="props.isProjectLocked ? projectIsLockedInfo : 'Ajouter l\'environnement'"
        primary
        icon="ri:upload-cloud-line"
        @click="addEnvironment()"
      />
      <DsfrButton
        label="Annuler"
        data-testid="cancelEnvironmentBtn"
        secondary
        icon="ri:close-line"
        @click="cancel()"
      />
    </div>
    <LoadingCt
      v-if="snackbarStore.isWaitingForResponse"
      description="Opérations en cours sur l'environnement"
    />
  </div>
</template>
