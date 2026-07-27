<script setup lang="ts">
import type { UpdateDeploymentValueSource } from '@cpn-console/shared'
import { hasExternalValueSource, newInternalValueSource } from '@/utils/deployment-draft'
import { getRandomId, swapItems } from '@/utils/func'

const props = defineProps<{
  repoOptions: { text: string, value: string }[]
  disabled: boolean
  isDirty: boolean
}>()

const valueSources = defineModel<UpdateDeploymentValueSource[]>({ default: () => [] })

// Stable per-row keys, kept in lockstep with the array so reordering swaps rendered
// rows instead of relying on positional (index) keys, which break reactivity on move.
const rowKeys = ref<string[]>([])
function freshKey() {
  return getRandomId('value-source')
}

// Rebuild keys only when the array is replaced from the outside (initial load / edit),
// detected by a length mismatch. In-component mutations keep the lengths aligned.
watch(valueSources, (sources) => {
  if (rowKeys.value.length !== sources.length) {
    rowKeys.value = sources.map(freshKey)
  }
}, { immediate: true })

function addValueSource() {
  valueSources.value = [...valueSources.value, newInternalValueSource()]
  rowKeys.value = [...rowKeys.value, freshKey()]
}

function remove(index: number) {
  valueSources.value = valueSources.value.filter((_, i) => i !== index)
  rowKeys.value = rowKeys.value.filter((_, i) => i !== index)
}

function move(index: number, direction: -1 | 1) {
  const nextSources = swapItems(valueSources.value, index, direction)
  // Same reference means the move fell off either end of the list: nothing to do.
  if (nextSources === valueSources.value) {
    return
  }

  // Swap the source and its key together so the row keeps its identity as it moves.
  valueSources.value = nextSources
  rowKeys.value = swapItems(rowKeys.value, index, direction)
}

function update(index: number, value: UpdateDeploymentValueSource) {
  valueSources.value = valueSources.value.map((valueSource, i) => i === index ? value : valueSource)
}

// Only one external source is allowed per deployment; internal sources are unlimited.
// Once a source is external, the "Externe" choice is disabled on every other row.
const hasExternal = computed(() => hasExternalValueSource(valueSources.value))
</script>

<template>
  <div class="w-full flex flex-col gap-2">
    <div class="flex flex-col gap-0">
      <h6 class="fr-mb-0 fr-text--sm">
        Sources de valeurs (Helm)
      </h6>
      <p class="fr-text--xs fr-text-mention--grey fr-mb-1v">
        Liste ordonnée, optionnelle : chaque source surcharge les précédentes. Une seule source externe autorisée.
      </p>
    </div>

    <p v-if="valueSources.length === 0" class="fr-text--xs fr-text-mention--grey fr-mb-0">
      Aucune source : le fichier <code class="fr-text--xs fr-mb-0">values.yaml</code> du dépôt est utilisé par défaut.
    </p>

    <DeploymentValueSourceOption
      v-for="(valueSource, index) in valueSources"
      :key="rowKeys[index]"
      :model-value="valueSource"
      :position="index + 1"
      :repo-options="props.repoOptions"
      :disabled="props.disabled"
      :is-dirty="props.isDirty"
      :external-disabled="valueSource.type !== 'external' && hasExternal"
      :can-delete="true"
      :can-move-up="index > 0"
      :can-move-down="index < valueSources.length - 1"
      @update:model-value="(value: UpdateDeploymentValueSource) => update(index, value)"
      @delete="remove(index)"
      @move-up="move(index, -1)"
      @move-down="move(index, 1)"
    />

    <div v-if="!props.disabled" class="w-full flex justify-end gap-2 mt-2">
      <DsfrButton
        type="button"
        label="Ajouter une source de valeurs"
        icon="ri:add-line"
        secondary
        size="sm"
        @click="addValueSource"
      />
    </div>
  </div>
</template>
