<script setup lang="ts">
import type { UpdateDeploymentValueSource } from '@cpn-console/shared'
import { valueSourcePathPreview } from '@/utils/deployment-draft'
import { getRandomId, toStringValue } from '@/utils/func'

const props = defineProps<{
  externalRef: string | null
  deployPath: string
  position: number
  disabled: boolean
  isDirty: boolean
  canDelete: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  isHighestPriority: boolean
}>()

defineEmits<{ delete: [], moveUp: [], moveDown: [] }>()

const model = defineModel<UpdateDeploymentValueSource>({ required: true })

// Unique radio group name so several segmented sets on the page don't interfere.
const typeName = getRandomId('value-source-type')

const typeOptions = [
  { label: 'Interne', value: 'internal' },
  { label: 'Externe', value: 'external' },
]

// Internal and external sources live in separate tables, so a row switching type
// drops its id and is recreated server-side instead of updating the wrong table.
function setType(value: string | number) {
  if (value === model.value.type || (value === 'external' && props.externalRef === null)) {
    return
  }
  model.value = { type: value === 'external' ? 'external' : 'internal', path: model.value.path }
}

function updatePath(path: string): void {
  model.value = { ...model.value, path }
}

// An internal source lives in the deployed repository: its path is resolved from the
// deployed directory, like the legacy value files. An external source points to the
// values repository, whose root is the only reference available.
const pathHint = computed(() => model.value.type === 'external'
  ? 'Chemin du fichier relatif à la racine du dépôt de valeurs externe.'
  : 'Chemin du fichier relatif au répertoire à déployer.')

const pathPreview = computed(() => valueSourcePathPreview(model.value, props.deployPath, props.externalRef))
</script>

<template>
  <div class="w-full py-3 px-4 border border-solid border-gray-200 flex flex-col gap-2">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-center gap-2">
        <span class="fr-text--sm fr-text-mention--grey font-bold mb-0">Fichier #{{ props.position }}</span>
        <DsfrBadge
          v-if="props.isHighestPriority"
          class="fr-mb-0"
          label="priorité la plus haute"
          type="success"
          no-icon
          small
        />
      </div>
      <div v-if="!props.disabled" class="flex items-center gap-1">
        <DsfrButton
          icon-only
          icon="ri:arrow-up-line"
          size="sm"
          tertiary
          no-outline
          title="Monter"
          data-action="move-up"
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
          data-action="move-down"
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

    <!-- Without the external values ref, every source is internal: nothing to choose. -->
    <div v-if="props.externalRef !== null" class="flex items-center justify-center gap-2 w-full">
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

    <DsfrInputGroup
      :model-value="model.path"
      label="Chemin du fichier de valeurs"
      label-visible
      placeholder="values.yaml"
      :hint="pathHint"
      required
      :disabled="props.disabled"
      :error-message="props.isDirty && !model.path ? 'Le chemin du fichier est requis' : undefined"
      @update:model-value="(value: string | number | undefined) => updatePath(toStringValue(value))"
    />
    <p v-if="pathPreview" class="fr-text--xs fr-text-mention--grey fr-mb-0">
      <code class="fr-text--xs fr-mb-0">{{ pathPreview }}</code>
    </p>
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
