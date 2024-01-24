<script lang="ts" setup>
import { computed, onBeforeMount, ref } from 'vue'
import { quotaSchema, schemaValidator } from '@dso-console/shared'
import { copyContent } from '@/utils/func.js'
import type { UpdateQuotaType } from '@/views/admin/ListQuotas.vue'

const props = defineProps({
  isNewQuota: {
    type: Boolean,
    default: false,
  },
  quota: {
    type: Object,
    default: () => ({}),
  },
  allStages: {
    type: Array,
    default: () => [],
  },
  associatedEnvironments: {
    type: Array,
    default: () => [],
  },
  isUpdatingQuota: {
    type: Boolean,
    default: false,
  },
})

const localQuota = ref(props.quota)
const stageNames = ref([])
const isDeletingQuota = ref(false)
const quotaToDelete = ref('')

const errorSchema = computed(() => schemaValidator(quotaSchema, localQuota.value))
const isQuotaValid = computed(() => Object.keys(errorSchema.value).length === 0)

const updateStages = (key: string, value: any) => {
  localQuota.value[key] = value
  // Retrieve array of stage names from child component, map it into array of stageIds.
  localQuota.value.stageIds = localQuota.value.stageIds
    // @ts-ignore
    .map(stageName => props.allStages?.find(sFromAll => sFromAll.name === stageName)?.id)
}

const emit = defineEmits<{
  add: [value: typeof localQuota.value]
  update: [value: UpdateQuotaType]
  cancel: []
  delete: [value: typeof localQuota.value.id]
}>()

const addQuota = () => {
  localQuota.value.cpu = parseFloat(localQuota.value.cpu)
  if (isQuotaValid.value) emit('add', localQuota.value)
}

const updateQuota = () => {
  const updatedQuota = {
    quotaId: localQuota.value.id,
    isPrivate: localQuota.value.isPrivate,
    stageIds: localQuota.value.stageIds,
  }
  if (isQuotaValid.value) emit('update', updatedQuota)
}

const cancel = () => {
  emit('cancel')
}

type AssociatedEnvironment = {
  organization: string,
  project: string,
  name: string,
  stage: string,
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
        // @ts-ignore
        onClick: () => copyContent(value),
      }),
      ),
    )
}

onBeforeMount(() => {
  // Retrieve array of quotaStage from parent component, map it into array of stage names and pass it to child component.
  localQuota.value = props.quota
  stageNames.value = localQuota.value.quotaStage?.map(qs => qs.stageId).map(stageId => props.allStages?.find(stage => stage.id === stageId)?.name)
})

</script>

<template>
  <div
    class="relative"
  >
    <h1>Informations du quota <code v-if="localQuota.name">{{ localQuota.name }}</code></h1>
    <DsfrInputGroup
      v-model="localQuota.name"
      label="Nom du quota"
      label-visible
      :required="true"
      data-testid="nameInput"
      :disabled="!isNewQuota"
      placeholder="medium"
    />
    <DsfrInputGroup
      v-model="localQuota.memory"
      label="Mémoire allouée"
      label-visible
      :required="true"
      data-testid="memoryInput"
      :disabled="!isNewQuota"
      placeholder="4Gi"
    />
    <DsfrInputGroup
      v-model="localQuota.cpu"
      label="CPU alloué(s)"
      label-visible
      type="number"
      min="0"
      max="100"
      step="1"
      :required="true"
      data-testid="cpuInput"
      :disabled="!isNewQuota"
      placeholder="2"
    />
    <DsfrCheckbox
      v-model="localQuota.isPrivate"
      label="Quota privé"
      hint="Cocher si le quota doit être réservé aux administrateurs."
      name="isQuotaPrivate"
      required
      data-testid="isQuotaPrivateCbx"
    />
    <div
      class="fr-mb-2w"
    >
      <MultiSelector
        id="stages-select"
        :options="allStages?.map(stage => ({ id: stage.id, name: `${stage.name}` }))"
        :array="stageNames"
        :disabled="!allStages?.length"
        no-choice-label="Aucun type d'environnement disponible"
        choice-label="Veuillez choisir les types d'environnement à associer"
        label="Nom des types d'environnement"
        description="Sélectionnez les types d'environnement autorisés à utiliser ce quota."
        @update="updateStages('stageIds', $event)"
      />
    </div>
    <div
      class="flex space-x-10 mt-5"
    >
      <DsfrButton
        v-if="isNewQuota"
        label="Ajouter le quota"
        data-testid="addQuotaBtn"
        :disabled="!isQuotaValid"
        primary
        icon="ri-upload-cloud-line"
        @click="addQuota()"
      />
      <DsfrButton
        v-else
        label="Enregistrer"
        data-testid="updateQuotaBtn"
        :disabled="!isQuotaValid"
        primary
        icon="ri-upload-cloud-line"
        @click="updateQuota()"
      />
      <DsfrButton
        label="Annuler"
        data-testid="cancelQuotaBtn"
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
        description="Le quota ne peut être supprimé, car les environnements ci-dessous y ont souscrit. Cependant, vous pouvez le rendre privé pour qu'il ne soit plus proposé aux utilisateurs lors de la création de futurs environnements."
        small
      />
      <div
        class="flex flex-row flex-wrap gap-4 w-full"
      >
        <DsfrTable
          data-testid="associatedEnvironmentsTable"
          :headers="['Organisation', 'Projet', 'Nom', 'Type d\'environnement', 'Souscripteur']"
          :rows="getRows(props.associatedEnvironments)"
        />
      </div>
    </div>
    <div
      v-if="localQuota.id && !props.associatedEnvironments.length"
      data-testid="deleteQuotaZone"
      class="danger-zone"
    >
      <div class="danger-zone-btns">
        <DsfrButton
          v-show="!isDeletingQuota"
          data-testid="showDeleteQuotaBtn"
          :label="`Supprimer le quota ${localQuota.name}`"
          secondary
          icon="ri-delete-bin-7-line"
          @click="isDeletingQuota = true"
        />
        <DsfrAlert
          class="<md:mt-2"
          description="La suppression d'un quota est irréversible."
          type="warning"
          small
        />
      </div>
      <div
        v-if="isDeletingQuota"
        class="fr-mt-4w"
      >
        <DsfrInput
          v-model="quotaToDelete"
          data-testid="deleteQuotaInput"
          :label="`Veuillez taper '${localQuota.name}' pour confirmer la suppression du quota`"
          label-visible
          :placeholder="localQuota.name"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            data-testid="deleteQuotaBtn"
            :label="`Supprimer définitivement le quota ${localQuota.name}`"
            :disabled="quotaToDelete !== localQuota.name"
            :title="`Supprimer définitivement le quota ${localQuota.name}`"
            secondary
            icon="ri-delete-bin-7-line"
            @click="$emit('delete', localQuota.id)"
          />
          <DsfrButton
            label="Annuler"
            primary
            @click="isDeletingQuota = false"
          />
        </div>
      </div>
    </div>
    <LoadingCt
      v-if="props.isUpdatingQuota"
      description="Opérations en cours sur le quota"
    />
  </div>
</template>
