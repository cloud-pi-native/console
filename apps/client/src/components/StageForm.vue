<script lang="ts" setup>
import { computed, onBeforeMount, ref } from 'vue'
import { SharedZodError, StageSchema } from '@dso-console/shared'
import { copyContent } from '@/utils/func.js'
import type { UpdateStageType } from '@/views/admin/ListStages.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps({
  isNewStage: {
    type: Boolean,
    default: false,
  },
  stage: {
    type: Object,
    default: () => ({}),
  },
  allQuotas: {
    type: Array,
    default: () => [],
  },
  allClusters: {
    type: Array,
    default: () => [],
  },
  associatedEnvironments: {
    type: Array,
    default: () => [],
  },
})

const localStage = ref(props.stage)
const quotaNames = ref([])
const clusterNames = ref([])
const isDeletingStage = ref(false)
const stageToDelete = ref('')

const errorSchema = computed<SharedZodError | undefined>(() => {
  let schemaValidation
  if (localStage.value.id) {
    schemaValidation = StageSchema.safeParse(localStage.value)
  } else {
    schemaValidation = StageSchema.omit({ id: true }).safeParse(localStage.value)
  }
  return schemaValidation.success ? undefined : schemaValidation.error
})
const isStageValid = computed(() => !errorSchema.value)

const updateClusters = (key: string, value: any) => {
  localStage.value[key] = value
  // Retrieve array of cluster names from child component, map it into array of clusterIds.
  localStage.value.clusterIds = localStage.value.clusterIds
    // @ts-ignore
    .map(clusterName => props.allClusters?.find(cFromAll => cFromAll.label === clusterName)?.id)
}

const updateQuotas = (key: string, value: any) => {
  localStage.value[key] = value
  // Retrieve array of quota names from child component, map it into array of quotaIds.
  localStage.value.quotaIds = localStage.value.quotaIds
    // @ts-ignore
    .map(quotaName => props.allQuotas?.find(qFromAll => qFromAll.name === quotaName)?.id)
}

const emit = defineEmits<{
  add: [value: typeof localStage.value]
  update: [value: UpdateStageType]
  cancel: []
  delete: [value: typeof localStage.value.id]
}>()

const addStage = () => {
  if (isStageValid.value) emit('add', localStage.value)
}

const updateStage = () => {
  const updatedStage = {
    stageId: localStage.value.id,
    quotaIds: localStage.value.quotaIds,
    clusterIds: localStage.value.clusterIds,
  }
  if (isStageValid.value) emit('update', updatedStage)
}

const cancel = () => {
  emit('cancel')
}

type AssociatedEnvironment = {
  organization: string,
  project: string,
  name: string,
  quota: string,
}
const getRows = (associatedEnvironments: AssociatedEnvironment[]) => {
  return associatedEnvironments
    .map(associatedEnvironment => Object
      .values(associatedEnvironment)
      .map(value => ({
        component: 'code',
        text: value,
        title: 'Copier la valeur',
        class: 'fr-text-default--info text-xs cursor-pointer',
        onClick: () => copyContent(value),
      }),
      ),
    )
}

onBeforeMount(() => {
  localStage.value = props.stage
  // Retrieve array of quotaStage from parent component, map it into array of quota names and pass it to child component.
  quotaNames.value = localStage.value.quotaStage?.map(qs => qs.quotaId).map(quotaId => props.allQuotas?.find(quota => quota.id === quotaId)?.name)
  // Retrieve array of clusterIds from parent component, map it into array of cluster names and pass it to child component.
  clusterNames.value = localStage.value.clusters?.map(cluster => cluster.label)
})

</script>

<template>
  <div
    class="relative"
  >
    <h1>Informations du type d'environnement <code v-if="localStage.name">{{ localStage.name }}</code></h1>
    <DsfrInputGroup
      v-model="localStage.name"
      label="Nom du type d'environnement"
      label-visible
      hint="Ne doit pas contenir d'espace, de trait d'union, ni de caractères spéciaux."
      :required="true"
      data-testid="nameInput"
      :disabled="!isNewStage"
      placeholder="dev"
    />
    <div
      class="fr-mb-2w"
    >
      <MultiSelector
        id="quotas-select"
        :options="allQuotas?.map(quota => ({ id: quota.id, name: `${quota.name}` }))"
        :array="quotaNames"
        :disabled="!allQuotas?.length"
        no-choice-label="Aucun quota disponible"
        choice-label="Veuillez choisir les quotas à associer"
        label="Nom des quotas"
        description="Sélectionnez les quotas autorisés à utiliser ce type d'environnement."
        @update="updateQuotas('quotaIds', $event)"
      />
    </div>
    <div
      class="fr-mb-2w"
    >
      <MultiSelector
        id="clusters-select"
        :options="allClusters?.map(cluster => ({ id: cluster.id, name: `${cluster.label}` }))"
        :array="clusterNames"
        :disabled="!allClusters?.length"
        no-choice-label="Aucun cluster disponible"
        choice-label="Veuillez choisir les clusters à associer"
        label="Nom des clusters"
        description="Sélectionnez les clusters autorisés à utiliser ce type d'environnement."
        @update="updateClusters('clusterIds', $event)"
      />
    </div>
    <div
      class="flex space-x-10 mt-5"
    >
      <DsfrButton
        v-if="isNewStage"
        label="Ajouter le type d'environnement"
        data-testid="addStageBtn"
        :disabled="!isStageValid"
        primary
        icon="ri-upload-cloud-line"
        @click="addStage()"
      />
      <DsfrButton
        v-else
        label="Enregistrer"
        data-testid="updateStageBtn"
        :disabled="!isStageValid"
        primary
        icon="ri-upload-cloud-line"
        @click="updateStage()"
      />
      <DsfrButton
        label="Annuler"
        data-testid="cancelStageBtn"
        secondary
        icon="ri-close-line"
        @click="cancel()"
      />
    </div>
    <div
      v-if="props.associatedEnvironments.length"
      class="fr-my-6w"
      data-testid="associatedEnvironmentsZone"
    >
      <DsfrAlert
        description="Le type d'environnement ne peut être supprimé, car les environnements ci-dessous y ont souscrit."
        small
      />
      <div
        class="flex flex-row flex-wrap gap-4 w-full"
      >
        <DsfrTable
          data-testid="associatedEnvironmentsTable"
          :headers="['Organisation', 'Projet', 'Nom', 'Quota', 'Cluster', 'Souscripteur']"
          :rows="getRows(props.associatedEnvironments)"
        />
      </div>
    </div>
    <div
      v-if="localStage.id && !props.associatedEnvironments.length"
      data-testid="deleteStageZone"
      class="danger-zone"
    >
      <div class="danger-zone-btns">
        <DsfrButton
          v-show="!isDeletingStage"
          data-testid="showDeleteStageBtn"
          :label="`Supprimer le type d'environnement ${localStage.name}`"
          secondary
          icon="ri-delete-bin-7-line"
          @click="isDeletingStage = true"
        />
        <DsfrAlert
          class="<md:mt-2"
          description="La suppression d'un type d'environnement est irréversible."
          type="warning"
          small
        />
      </div>
      <div
        v-if="isDeletingStage"
        class="fr-mt-4w"
      >
        <DsfrInput
          v-model="stageToDelete"
          data-testid="deleteStageInput"
          :label="`Veuillez taper '${localStage.name}' pour confirmer la suppression du type d'environnement`"
          label-visible
          :placeholder="localStage.name"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            data-testid="deleteStageBtn"
            :label="`Supprimer définitivement le type d'environnement ${localStage.name}`"
            :disabled="stageToDelete !== localStage.name"
            :title="`Supprimer définitivement le type d'environnement ${localStage.name}`"
            secondary
            icon="ri-delete-bin-7-line"
            @click="$emit('delete', localStage.id)"
          />
          <DsfrButton
            label="Annuler"
            primary
            @click="isDeletingStage = false"
          />
        </div>
      </div>
    </div>
    <LoadingCt
      v-if="useSnackbarStore().isWaitingForResponse"
      description="Opérations en cours sur le type d'environnement"
    />
  </div>
</template>
