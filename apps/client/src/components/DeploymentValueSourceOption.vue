<script setup lang="ts">
import type { UpdateDeploymentValueSource } from '@cpn-console/shared'
import { getRandomId, toStringValue } from '@/utils/func'

const props = defineProps<{
  repoOptions: { text: string, value: string }[]
  position: number
  disabled: boolean
  isDirty: boolean
  canDelete: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  externalDisabled: boolean
}>()

defineEmits<{ delete: [], moveUp: [], moveDown: [] }>()

const model = defineModel<UpdateDeploymentValueSource>({ required: true })

// Unique radio group name so several segmented sets on the page don't interfere.
const typeName = getRandomId('value-source-type')

// The "Externe" choice is disabled once another source already uses it: a deployment may only carry a single external source.
const typeOptions = computed(() => [
  { label: 'Interne', value: 'internal' },
  { label: 'Externe', value: 'external', disabled: props.externalDisabled },
])

function setType(value: string | number) {
  if (value === 'external' && props.externalDisabled) {
    return
  }
  model.value = value === 'external'
    ? { type: 'external', id: model.value.id, path: model.value.path, ref: '', targetRevision: '', repositoryId: '' }
    : { type: 'internal', id: model.value.id, path: model.value.path }
}

// Field patches never change the discriminant, so `type` is intentionally excluded:
// spreading it over the union keeps each variant's `type` literal intact (use
// setType to switch variants).
type ValueSourcePatch = Partial<Pick<Extract<UpdateDeploymentValueSource, { type: 'external' }>, 'path' | 'ref' | 'targetRevision' | 'repositoryId'>>

function update(patch: ValueSourcePatch): void {
  model.value = { ...model.value, ...patch }
}
</script>

<template>
  <div class="w-full py-3 px-4 border border-solid border-gray-200 flex flex-col gap-2">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-start gap-2">
        <span class="fr-text--sm fr-text-mention--grey font-bold mb-0">Sources #{{ props.position }}</span>
      </div>
      <div v-if="!props.disabled" class="flex items-center gap-1">
        <DsfrButton
          icon-only
          icon="ri:arrow-up-line"
          size="sm"
          tertiary
          no-outline
          title="Monter"
          :disabled="!props.canMoveUp"
          @click="$emit('moveUp')"
        />
        <DsfrButton
          icon-only
          icon="ri:arrow-down-line"
          size="sm"
          tertiary
          no-outline
          title="Descendre"
          :disabled="!props.canMoveDown"
          @click="$emit('moveDown')"
        />
        <DsfrButton
          icon-only
          icon="ri:delete-bin-7-line"
          size="sm"
          secondary
          title="Supprimer"
          :disabled="!props.canDelete"
          @click="$emit('delete')"
        />
      </div>
    </div>

    <div class="flex items-center justify-center gap-2 w-full">
      <DsfrSegmentedSet
        :model-value="model.type"
        :name="typeName"
        :options="typeOptions"
        inline
        legend=""
        :disabled="props.disabled"
        class="w-full"
        @update:model-value="setType"
      />
    </div>

    <p v-if="props.externalDisabled" class="fr-text--xs fr-text-mention--grey fr-mb-0">
      Une source externe est déjà définie : une seule est autorisée par déploiement.
    </p>

    <template v-if="model.type === 'external'">
      <DsfrSelect
        :model-value="model.repositoryId ?? undefined"
        label="Dépôt de valeurs"
        :options="props.repoOptions"
        required
        :disabled="props.disabled"
        :error-message="props.isDirty && !model.repositoryId ? 'Le dépôt de valeurs est requis' : undefined"
        @update:model-value="(value: string | number) => update({ repositoryId: toStringValue(value) })"
      />
      <DsfrInputGroup
        :model-value="model.ref"
        label="Nom de la source (ref)"
        label-visible
        placeholder="infra-values"
        hint="Nom court (ref) donné à cette source pour qu'ArgoCD la référence. Unique par déploiement."
        required
        :disabled="props.disabled"
        :error-message="props.isDirty && !model.ref ? 'Le nom de la référence est requis' : undefined"
        @update:model-value="(value: string | number | undefined) => update({ ref: toStringValue(value) })"
      />
      <DsfrInputGroup
        :model-value="model.targetRevision"
        label="Révision (branche, tag, commit)"
        label-visible
        placeholder="HEAD"
        :disabled="props.disabled"
        @update:model-value="(value: string | number | undefined) => update({ targetRevision: toStringValue(value) })"
      />
    </template>

    <DsfrInputGroup
      :model-value="model.path"
      label="Chemin du fichier de valeurs"
      label-visible
      :placeholder="model.type === 'external' ? 'values-&lt;env&gt;.yaml' : 'values.yaml'"
      hint="Chemin du fichier relatif à la racine du dépôt. Le motif <env> est remplacé par le nom de l'environnement."
      required
      :disabled="props.disabled"
      :error-message="props.isDirty && !model.path ? 'Le chemin du fichier est requis' : undefined"
      @update:model-value="(value: string | number | undefined) => update({ path: toStringValue(value) })"
    />
  </div>
</template>

<style lang="css" scoped>
.fr-select-group,
.fr-input-group {
  margin-bottom: .5rem;
}

.fr-form-group :deep(.fr-segmented),
.fr-form-group :deep(.fr-segmented__elements) {
  width: 100%;
}

.fr-form-group :deep(.fr-segmented__element) {
  flex-grow: 1;
}

.fr-form-group :deep(.fr-segmented__element label) {
  justify-content: center;
}
</style>
