<script lang="ts" setup>
import { computed, onBeforeMount, ref } from 'vue'
import type {
  CleanedCluster,
  CreateEnvironmentBody,
  Environment,
} from '@cpn-console/shared'
import {
  deleteValidationInput,
  EnvironmentSchema,
  generateNamespaceName,
  longestEnvironmentName,
  parseZodError,
  projectIsLockedInfo,
} from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar'
import { useQuotaStore } from '@/stores/quota'
import { useStageStore } from '@/stores/stage'
import { useZoneStore } from '@/stores/zone'
import { copyContent, getRandomId } from '@/utils/func'

interface OptionType {
  text: string
  value: string
}

const props = withDefaults(defineProps<{
  environment?: Partial<Omit<Environment, 'updatedAt' | 'createdAt'>>
  isEditable?: boolean
  canManage: boolean
  isProjectLocked?: boolean
  availableClusters: CleanedCluster[]
  canSeePrivateQuotas?: boolean
}>(), {
  environment: () => ({
    projectId: '',
    id: '',
    name: '',
    stageId: undefined,
    quotaId: undefined,
    clusterId: undefined,
  }),
  isEditable: true,
  isProjectLocked: false,
  canSeePrivateQuotas: false,
})

const emit = defineEmits<{
  addEnvironment: [environment: Omit<CreateEnvironmentBody, 'projectId'>]
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

const schema = computed(() => {
  if (localEnvironment.value?.id) {
    const schemaValidation = EnvironmentSchema.pick({ id: true, quotaId: true }).safeParse(localEnvironment.value)
    return schemaValidation
  } else {
    const schemaValidation = EnvironmentSchema.pick({ clusterId: true, name: true, quotaId: true, stageId: true }).safeParse(localEnvironment.value)
    return schemaValidation
  }
})

const availableClusters: ComputedRef<CleanedCluster[]> = computed(() => props.availableClusters
  .filter(cluster => cluster.zoneId === zoneId.value)
  .filter(cluster => cluster.stageIds.includes(localEnvironment.value.stageId ?? '')),
)

const clusterInfos = computed(() => availableClusters.value.find(cluster => cluster.id === localEnvironment.value.clusterId)?.infos)

function setEnvironmentOptions() {
  zoneOptions.value = zoneStore.zones.map(zone => ({
    text: zone.label,
    value: zone.id,
  }))
  stageOptions.value = stageStore.stages.map(stage => ({
    text: stage.name,
    value: stage.id,
  }))
  clusterOptions.value = props.availableClusters
    .filter(cluster =>
      (cluster.stageIds.includes(localEnvironment.value.stageId ?? '') // correspondant à ce stage
        && cluster.zoneId === zoneId.value) // dont la zone d'attachement est celle choisie
        || cluster.id === localEnvironment.value.clusterId, // ou alors celui associé à l'environnment en cours de modification
    )
    .map(cluster => ({
      text: cluster.label,
      value: cluster.id,
    }))
}

function setQuotaOptions() {
  quotaOptions.value
    = quotaStore.quotas
      .filter(quota =>
        (quota.stageIds.includes(localEnvironment.value.stageId ?? '') // quotas disponibles pour ce type d'environnement
          && (!quota.isPrivate || props.canSeePrivateQuotas)) // et ne pas afficher les quotas privés
          || quota.id === localEnvironment.value.quotaId) // ou quota actuellement associé (au cas où l'association ne soit plus disponible)
      .map(quota => ({
        text: `${quota.name} (${quota.cpu}CPU, ${quota.memory})`,
        value: quota.id,
      }))
}

function resetCluster() {
  localEnvironment.value.clusterId = ''
}

function save() {
  if (schema.value.success) {
    if ('id' in schema.value.data) {
      emit('putEnvironment', schema.value.data)
    } else {
      emit('addEnvironment', schema.value.data)
    }
  } else {
    snackbarStore.setMessage(parseZodError(schema.value.error))
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
  setQuotaOptions()
})

onMounted(() => {
  zoneId.value = props.availableClusters?.find(cluster => cluster.id === localEnvironment.value.clusterId)?.zoneId
})

watch(zoneId, () => {
  setEnvironmentOptions()
})

watch(localEnvironment.value, () => {
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
    :legend="`Informations de l\'environnement ${localEnvironment.name ?? ''}`"
    :hint="props.isEditable ? 'Les champs munis d\'une astérisque (*) sont requis' : undefined"
    data-testid="environmentFieldset"
  >
    <code
      v-if="localEnvironment.id && localEnvironment.projectId"
      class="fr-text-default--info text-xs cursor-pointer"
      @click="copyContent(generateNamespaceName(localEnvironment.projectId, localEnvironment.id))"
    >
      ns kubernetes: {{ generateNamespaceName(localEnvironment.projectId, localEnvironment.id) }}
    </code>
    <div
      title="Namespace kubernetes, les environnements créés en version <=8.22.1 utilisent l'ancien système de nommage"
      class="inline"
    >
      <v-icon
        name="ri:question-line"
      />
    </div>

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
      :hint="`Choix de la zone cible pour le déploiement de l\'environnement ${localEnvironment.name ? localEnvironment.name : 'en cours de création'}.`"
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
      hint="Type d'environnement proposé par DSO, conditionne les quotas et les clusters auxquels vous aurez accès pour créer votre environnement."
      required
      :disabled="!props.isEditable || !props.canManage"
      :options="stageOptions"
      @update:model-value="() => { resetCluster(); setQuotaOptions() }"
    />
    <div>
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
          data-testid="quota-select"
          select-id="quota-select"
          label="Dimensionnement des ressources allouées à l'environnement"
          hint="Si votre projet nécessite d'avantage de ressources que celles proposées ci-dessus, contactez les administrateurs."
          required
          :options="quotaOptions"
          :disabled="!props.canManage"
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
        :hint="`Choix du cluster cible pour le déploiement de l\'environnement ${localEnvironment.name ? localEnvironment.name : 'en cours de création'}.`"
        required
        default-unselected-text="Choisissez un cluster de destination"
        :disabled="!props.isEditable || !props.canManage"
        :options="clusterOptions"
      />
      <DsfrAlert
        v-if="clusterInfos"
        data-testid="clusterInfos"
        title="À propos du cluster"
      >
        <pre>{{ clusterInfos }}</pre>
      </DsfrAlert>
      <div
        v-if="localEnvironment.id && canManage"
        class="flex space-x-10 mt-5"
      >
        <DsfrButton
          label="Enregistrer"
          data-testid="putEnvironmentBtn"
          :disabled="props.isProjectLocked || !schema.success"
          :title="props.isProjectLocked ? projectIsLockedInfo : 'Enregistrer les changements'"
          primary
          icon="ri:upload-cloud-line"
          @click="save"
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
  <div v-if="localEnvironment.id && props.canManage">
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
          :label="`Veuillez taper '${deleteValidationInput}' pour confirmer la suppression de l'environnement`"
          label-visible
          :placeholder="deleteValidationInput"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            data-testid="deleteEnvironmentBtn"
            :label="`Supprimer définitivement l'environnement ${localEnvironment.name}`"
            :disabled="environmentToDelete !== deleteValidationInput"
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
      :disabled="props.isProjectLocked || !schema.success"
      :title="props.isProjectLocked ? projectIsLockedInfo : 'Ajouter l\'environnement'"
      primary
      icon="ri:upload-cloud-line"
      @click="save"
    />
    <DsfrButton
      label="Annuler"
      data-testid="cancelEnvironmentBtn"
      secondary
      icon="ri:close-line"
      @click="cancel()"
    />
  </div>
</template>
