<script lang="ts" setup>
import { computed, onBeforeMount, ref } from 'vue'
import { ZoneSchema, SharedZodError, instanciateSchema } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps({
  isNewZone: {
    type: Boolean,
    default: false,
  },
  zone: {
    type: Object,
    default: () => ({ ...instanciateSchema(ZoneSchema, undefined) }),
  },
  allClusters: {
    type: Array,
    default: () => [],
  },
  associatedClusters: {
    type: Array,
    default: () => [],
  },
})

const localZone = ref(props.zone)
const clusterLabels = ref([])
const isDeletingZone = ref(false)
const zoneToDelete = ref('')

const errorSchema = computed<SharedZodError | undefined>(() => {
  let schemaValidation
  if (localZone.value.id) {
    schemaValidation = ZoneSchema.safeParse(localZone.value)
  } else {
    schemaValidation = ZoneSchema.omit({ id: true }).safeParse(localZone.value)
  }
  return schemaValidation.success ? undefined : schemaValidation.error
})
const isZoneValid = computed(() => !errorSchema.value)

const updateClusters = (key: string, value: any) => {
  localZone.value[key] = value
  // Retrieve array of cluster labels from child component, map it into array of clusterIds.
  localZone.value.clusterIds = localZone.value.clusterIds
    // @ts-ignore
    .map(clusterLabel => props.allClusters?.find(cFromAll => cFromAll.label === clusterLabel)?.id)
}

const emit = defineEmits<{
  add: [value: typeof localZone.value]
  update: [value: Partial<typeof localZone.value>]
  cancel: []
  delete: [value: typeof localZone.value.id]
}>()

const addZone = () => {
  if (isZoneValid.value) emit('add', localZone.value)
}

const updateZone = () => {
  const updatedZone = {
    zoneId: localZone.value.id,
    label: localZone.value.label,
    description: localZone.value.description,
    clusterIds: localZone.value.clusterIds,
  }
  if (isZoneValid.value) emit('update', updatedZone)
}

const cancel = () => {
  emit('cancel')
}

onBeforeMount(() => {
  // Retrieve array of clusters from parent component, map it into array of cluster labels and pass it to child component.
  localZone.value = props.zone
  clusterLabels.value = localZone.value.clusters?.map(cluster => cluster.label)
})

</script>

<template>
  <div
    class="relative"
  >
    <h1>Informations de la zone <code v-if="localZone.label">{{ localZone.label }}</code></h1>
    <DsfrInputGroup
      v-model="localZone.slug"
      label="Nom court de la zone"
      label-visible
      hint="Nom technique (slug) de la zone, utilisé par argo."
      :required="true"
      data-testid="slugInput"
      :disabled="!props.isNewZone"
      placeholder="dr"
    />
    <DsfrInputGroup
      v-model="localZone.label"
      label="Nom complet de la zone"
      label-visible
      hint="Nom complet de la zone, présenté aux utilisateurs."
      :required="true"
      data-testid="labelInput"
      placeholder="Diffusion restreinte"
    />
    <DsfrInputGroup
      v-model="localZone.description"
      data-testid="descriptionInput"
      type="text"
      is-textarea
      label="Informations supplémentaires sur la zone"
      label-visible
      hint="Facultatif. Attention, ces informations seront visibles par les utilisateurs de la console."
    />
    <div
      class="fr-mb-2w"
    >
      <MultiSelector
        id="clusters-select"
        :options="props.allClusters?.map(cluster => ({ id: cluster.id, name: `${cluster.label}` }))"
        :array="clusterLabels"
        :disabled="!props.isNewZone"
        :description="!props.isNewZone ? 'Veuillez procéder aux associations dans le formulaire des clusters concernés.': 'Sélectionnez les clusters autorisés à utiliser cette zone.'"
        no-choice-label="Aucun cluster disponible"
        choice-label="Veuillez choisir les clusters à associer"
        label="Nom des clusters"
        @update="updateClusters('clusterIds', $event)"
      />
    </div>
    <div
      class="flex space-x-10 mt-5"
    >
      <DsfrButton
        v-if="props.isNewZone"
        label="Ajouter la zone"
        data-testid="addZoneBtn"
        :disabled="!isZoneValid"
        primary
        icon="ri-upload-cloud-line"
        @click="addZone()"
      />
      <DsfrButton
        v-else
        label="Enregistrer"
        data-testid="updateZoneBtn"
        :disabled="!isZoneValid"
        primary
        icon="ri-upload-cloud-line"
        @click="updateZone()"
      />
      <DsfrButton
        label="Annuler"
        data-testid="cancelZoneBtn"
        secondary
        icon="ri-close-line"
        @click="cancel()"
      />
    </div>
    <DsfrAlert
      v-if="props.associatedClusters.length"
      class="mt-5"
      data-testid="associatedClustersAlert"
      description="La zone ne peut être supprimée, car des clusters y sont associés."
      small
    />
    <div
      v-if="localZone.id && !props.associatedClusters.length"
      data-testid="deleteZoneZone"
      class="danger-zone"
    >
      <div class="danger-zone-btns">
        <DsfrButton
          v-show="!isDeletingZone"
          data-testid="showDeleteZoneBtn"
          :label="`Supprimer la zone ${localZone.slug}`"
          secondary
          icon="ri-delete-bin-7-line"
          @click="isDeletingZone = true"
        />
        <DsfrAlert
          class="<md:mt-2"
          description="La suppression d'une zone est irréversible."
          type="warning"
          small
        />
      </div>
      <div
        v-if="isDeletingZone"
        class="fr-mt-4w"
      >
        <DsfrInput
          v-model="zoneToDelete"
          data-testid="deleteZoneInput"
          :label="`Veuillez taper '${localZone.slug}' pour confirmer la suppression de la zone`"
          label-visible
          :placeholder="localZone.slug"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            data-testid="deleteZoneBtn"
            :label="`Supprimer définitivement la zone ${localZone.slug}`"
            :disabled="zoneToDelete !== localZone.slug"
            :title="`Supprimer définitivement la zone ${localZone.slug}`"
            secondary
            icon="ri-delete-bin-7-line"
            @click="$emit('delete', localZone.id)"
          />
          <DsfrButton
            label="Annuler"
            primary
            @click="isDeletingZone = false"
          />
        </div>
      </div>
    </div>
    <LoadingCt
      v-if="useSnackbarStore().isWaitingForResponse"
      description="Opérations en cours sur la zone"
    />
  </div>
</template>
