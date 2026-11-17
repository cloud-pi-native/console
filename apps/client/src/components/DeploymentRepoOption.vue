<script setup lang="ts">
import type { WritableDeploymentExternalValuesRef } from '@cpn-console/shared'
import type { DeploymentSourceDraft, ValueSourcesDraft } from '@/utils/deployment-draft'
import { DeploymentSourceBaseSchema } from '@cpn-console/shared'
import { disableExternalValues, enableExternalValues, newDeploymentSourceDraft, withValueSourcesDraft } from '@/utils/deployment-draft'
import { getRandomId } from '@/utils/func'

const props = withDefaults(defineProps<{
  cantDelete: boolean
  options: { text: string, value: string }[]
  disabled: boolean
  isDirty: boolean
}>(), {
  options: () => [],
})
defineEmits<{ delete: [] }>()

const model = defineModel<DeploymentSourceDraft>({ default: newDeploymentSourceDraft })

const valueSourcesDraft = computed({
  get: (): ValueSourcesDraft => model.value,
  set: (draft: ValueSourcesDraft) => {
    model.value = withValueSourcesDraft(model.value, draft)
  },
})

const externalValuesRef = computed(() => model.value.useExternalValues ? model.value.externalValuesRef : undefined)

function updateExternalValuesRef(externalValuesRef: WritableDeploymentExternalValuesRef) {
  const source = model.value
  if (!source.useExternalValues) return
  model.value = { ...source, externalValuesRef }
}

const externalValuesCheckboxId = getRandomId('external-values')

const valueSourceRepoOptions = computed(() => props.options.filter(option => option.value !== model.value.repositoryId))

// Disabling drops the external rows: DeploymentValueSources rebuilds its row keys
// when the list it receives changes length.
function toggleExternalValues(enabled: boolean) {
  valueSourcesDraft.value = enabled ? enableExternalValues(model.value) : disableExternalValues(model.value)
}
</script>

<template>
  <div class="w-full">
    <div v-if="!($props.cantDelete || $props.disabled)" class="flex w-full justify-end">
      <DsfrButton icon-only icon="ri:delete-bin-7-line" secondary @click="$emit('delete')" />
    </div>
    <DsfrSelect v-model="model.repositoryId" label="Dépôt" :options="$props.options" required :disabled="$props.disabled" :error-message="$props.isDirty && !DeploymentSourceBaseSchema.pick({ repositoryId: true }).safeParse({ repositoryId: model.repositoryId }).success ? 'Le dépôt est requis' : undefined" />
    <DsfrInputGroup
      v-model="model.targetRevision"
      class="mb-2"
      placeholder="HEAD"
      label="Nom de la révision à déployer (branche, tag, commit)"
      label-visible
      :disabled="$props.disabled"
    />
    <DsfrInputGroup
      v-model="model.path"
      class="mb-2"
      placeholder="."
      label="Chemin du répertoire à déployer"
      label-visible
      :disabled="$props.disabled"
    />
    <DsfrCheckbox
      :id="externalValuesCheckboxId"
      :model-value="model.useExternalValues"
      value=""
      :name="externalValuesCheckboxId"
      label="Utiliser des valeurs externes"
      hint="Une seule référence par dépôt, partagée par toutes les sources externes."
      :disabled="props.disabled"
      @update:model-value="(value: boolean) => toggleExternalValues(value)"
    />
    <DeploymentExternalValueRef
      v-if="externalValuesRef"
      :model-value="externalValuesRef"
      :repo-options="valueSourceRepoOptions"
      :disabled="$props.disabled"
      :is-dirty="$props.isDirty"
      @update:model-value="updateExternalValuesRef"
    />
    <DeploymentValueSources
      v-model="valueSourcesDraft"
      :deploy-path="model.path ?? ''"
      :disabled="$props.disabled"
      :is-dirty="$props.isDirty"
    />
  </div>
</template>

<style lang="css" scoped>
.fr-fieldset__element,
.fr-select-group,
.fr-input-group {
  margin-bottom: .75rem;
}

.fr-fieldset__element {
  padding-inline: 0;
  padding-block-start: .5rem;
}

:deep(.fr-checkbox-group) {
  margin-bottom: 0;
}
</style>
