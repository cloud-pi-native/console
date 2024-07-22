<script lang="ts" setup>
import { computed, onBeforeMount, ref } from 'vue'
import { type Cluster, type Quota, type Stage, type StageAssociatedEnvironments, SharedZodError, StageSchema, CreateStageBody, AdminAuthorized } from '@cpn-console/shared'
import { toCodeComponent } from '@/utils/func.js'
import type { UpdateStageType } from '@/views/admin/ListStages.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useUserStore } from '@/stores/user.js'

const userStore = useUserStore()
const props = withDefaults(defineProps<{
  isNewStage: boolean
  stage: Stage
  allQuotas: Quota[]
  allClusters: Cluster[]
  associatedEnvironments: StageAssociatedEnvironments
}>(), {
  isNewStage: false,
  stage: () => ({ name: '', clusterIds: [], quotaIds: [], id: '' }),
  allQuotas: () => [],
  allClusters: () => [],
  associatedEnvironments: () => [],
})

const localStage = ref(props.stage)

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

const updateClusters = (value: string[]) => {
  localStage.value.clusterIds = value
}

const updateQuotas = (value: string[]) => {
  localStage.value.quotaIds = value
}

const emit = defineEmits<{
  add: [value: CreateStageBody]
  update: [value: UpdateStageType]
  cancel: []
  delete: [value: Stage['id']]
}>()

const addStage = () => {
  if (isStageValid.value) emit('add', localStage.value)
}

const updateStage = () => {
  if (isStageValid.value) emit('update', localStage.value)
}

const cancel = () => {
  emit('cancel')
}

const getRows = (associatedEnvironments: StageAssociatedEnvironments) => {
  return associatedEnvironments
    .map(associatedEnvironment => ([
      toCodeComponent(associatedEnvironment.organization),
      toCodeComponent(associatedEnvironment.project),
      toCodeComponent(associatedEnvironment.name),
      toCodeComponent(associatedEnvironment.quota),
      toCodeComponent(associatedEnvironment.cluster),
      toCodeComponent(associatedEnvironment.owner ?? ''),
    ]))
}

onBeforeMount(() => {
  localStage.value = props.stage
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
      <ChoiceSelector
        id="quotas-select"
        :wrapped="false"
        label="Quotas associés"
        description="Sélectionnez les quotas autorisés à utiliser ce type d'environnement."
        :options="allQuotas"
        :options-selected="allQuotas.filter(({ id}) => localStage.quotaIds.includes(id))"
        label-key="name"
        value-key="id"
        :disabled="!AdminAuthorized.ManageQuotas(userStore.adminPerms)"
        @update="(_q, quotaIds) => updateQuotas(quotaIds)"
      />
    </div>
    <div
      class="fr-mb-2w"
    >
      <ChoiceSelector
        id="clusters-select"
        :wrapped="false"
        label="Clusters associés"
        description="Sélectionnez les clusters autorisés à utiliser ce type d'environnement."
        :options="allClusters"
        :options-selected="allClusters.filter(({ id }) => localStage.clusterIds.includes(id))"
        label-key="label"
        value-key="id"
        :disabled="!AdminAuthorized.ManageClusters(userStore.adminPerms)"
        @update="(_c, clusterIds) => updateClusters(clusterIds)"
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
          title=""
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
