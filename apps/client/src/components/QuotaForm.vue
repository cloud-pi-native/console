<script lang="ts" setup>
import { computed, onBeforeMount, ref } from 'vue'
import type { Quota, QuotaAssociatedEnvironments, SharedZodError, Stage, UpdateQuotaBody, quotaContract } from '@cpn-console/shared'
import { QuotaSchema } from '@cpn-console/shared'
import { toCodeComponent } from '@/utils/func.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

type UpdateQuotaType = UpdateQuotaBody & Pick<Quota, 'id'> & Required<Pick<Quota, 'stageIds' | 'name'>>

const props = withDefaults(defineProps<{
  isNewQuota: boolean
  quota: UpdateQuotaType
  allStages: Stage[]
  associatedEnvironments: QuotaAssociatedEnvironments
}>(), {
  isNewQuota: false,
  quota: () => ({ isPrivate: false, stageIds: [] as string[], name: '', cpu: 1, id: '', memory: '' }),
  allStages: () => [],
  associatedEnvironments: () => [],
})

const emit = defineEmits<{
  add: [value: typeof quotaContract.createQuota.body._type]
  update: [value: UpdateQuotaType]
  cancel: []
  delete: [value: typeof localQuota.value.id]
}>()
const localQuota = ref(props.quota)
const isDeletingQuota = ref(false)
const quotaToDelete = ref<string>('')

const localCpu = computed<string>(() => String(localQuota.value.cpu))
const errorSchema = computed<SharedZodError | undefined>(() => {
  let schemaValidation
  if (localQuota.value.id) {
    schemaValidation = QuotaSchema.safeParse(localQuota.value)
  } else {
    schemaValidation = QuotaSchema.omit({ id: true }).safeParse(localQuota.value)
  }
  return schemaValidation.success ? undefined : schemaValidation.error
})
const isQuotaValid = computed(() => !errorSchema.value)

function updateStages(value: string[]) {
  // Retrieve array of stage names from child component, map it into array of stageIds.
  localQuota.value.stageIds = value
}

function addQuota() {
  if (isQuotaValid.value) emit('add', localQuota.value)
}

function updateQuota() {
  const updatedQuota: UpdateQuotaType = {
    id: localQuota.value.id,
    isPrivate: localQuota.value.isPrivate,
    stageIds: localQuota.value.stageIds,
    name: localQuota.value.name,
  }
  if (isQuotaValid.value) emit('update', updatedQuota)
}

function cancel() {
  emit('cancel')
}

function getRows(associatedEnvironments: QuotaAssociatedEnvironments) {
  return associatedEnvironments
    .map((associatedEnvironment) => {
      return [
        toCodeComponent(associatedEnvironment.organization),
        toCodeComponent(associatedEnvironment.project),
        toCodeComponent(associatedEnvironment.name),
        toCodeComponent(associatedEnvironment.stage),
        toCodeComponent(associatedEnvironment.owner),
      ]
    },
    )
}

onBeforeMount(() => {
  localQuota.value = props.quota
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
      v-model="localCpu"
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
      @update:model-value="(value: string) => localQuota.cpu = parseFloat(value)"
    />
    <DsfrCheckbox
      id="isQuotaPrivateCbx"
      v-model="localQuota.isPrivate"
      label="Quota privé"
      hint="Cocher si le quota doit être réservé aux administrateurs."
      name="isQuotaPrivate"
      required
    />
    <div
      class="fr-mb-2w"
    >
      <ChoiceSelector
        id="stages-select"
        :wrapped="true"
        label="Nom des types d'environnement"
        description="Sélectionnez les types d'environnement autorisés à utiliser ce cluster."
        :options="allStages"
        :options-selected="allStages
          .filter(({ id }) => localQuota.stageIds.includes(id))"
        label-key="name"
        value-key="id"
        @update="(_s: Stage[], stageIds: Stage['id'][]) => updateStages(stageIds)"
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
        icon="ri:upload-cloud-line"
        @click="addQuota()"
      />
      <DsfrButton
        v-else
        label="Enregistrer"
        data-testid="updateQuotaBtn"
        :disabled="!isQuotaValid"
        primary
        icon="ri:upload-cloud-line"
        @click="updateQuota()"
      />
      <DsfrButton
        label="Annuler"
        data-testid="cancelQuotaBtn"
        secondary
        icon="ri:close-line"
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
          title=""
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
          icon="ri:delete-bin-7-line"
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
            icon="ri:delete-bin-7-line"
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
      v-if="useSnackbarStore().isWaitingForResponse"
      description="Opérations en cours sur le quota"
    />
  </div>
</template>
