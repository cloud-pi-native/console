<script lang="ts" setup>
import { computed, onBeforeMount, ref } from 'vue'
import { ZoneSchema, SharedZodError, type CreateZoneBody, type UpdateZoneBody, type Zone, type Quota, type Cluster } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = withDefaults(defineProps<{
  isNewZone: boolean
  zone: Zone
  allQuotas: Quota[]
  allClusters: Cluster[]
  associatedClusters: unknown[]
}>(), {
  isNewZone: false,
  zone: () => ({
    id: '',
    label: '',
    slug: '',
    description: '',
    clusterIds: [],
  }),
  allQuotas: () => [],
  allClusters: () => [],
  associatedClusters: () => [],
})

const localZone = ref(props.zone)
const isDeletingZone = ref(false)
const zoneToDelete = ref('')

const errorSchema = computed<SharedZodError | undefined>(() => {
  let schemaValidation
  if (localZone.value.id) {
    schemaValidation = ZoneSchema.safeParse(localZone.value)
  } else {
    schemaValidation = ZoneSchema.omit({ id: true }).partial().safeParse(localZone.value)
  }
  return schemaValidation.success ? undefined : schemaValidation.error
})
const isZoneValid = computed(() => !errorSchema.value)

const updateClusters = (value: string[]) => {
  localZone.value.clusterIds = value
}

const emit = defineEmits<{
  add: [value: CreateZoneBody]
  update: [value: UpdateZoneBody & { zoneId: Zone['id'] }]
  cancel: []
  delete: [value: Zone['id']]
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
      placeholder="pub"
    />
    <DsfrInputGroup
      v-model="localZone.label"
      label="Nom complet de la zone"
      label-visible
      hint="Nom complet de la zone, présenté aux utilisateurs."
      :required="true"
      data-testid="labelInput"
      placeholder="Zone Publique"
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
      <ChoiceSelector
        id="clusters-select"
        :wrapped="false"
        label="Clusters associés"
        :description="!props.isNewZone ? 'Veuillez procéder aux associations dans le formulaire des clusters concernés.': 'Sélectionnez les clusters autorisés à utiliser cette zone.'"
        :options="props.allClusters"
        :options-selected="props.allClusters.filter(({ id }) => localZone.clusterIds.includes(id))"
        label-key="label"
        value-key="id"
        :disabled="!props.isNewZone"
        @update="(_c, clusterIds) => updateClusters(clusterIds)"
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
