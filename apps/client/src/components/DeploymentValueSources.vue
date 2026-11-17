<script setup lang="ts">
import type { UpdateDeploymentValueSource } from '@cpn-console/shared'
import type { ValueSourcesDraft } from '@/utils/deployment-draft'
import { newInternalValueSource, withValueSourceList } from '@/utils/deployment-draft'
import { getRandomId, swapItems } from '@/utils/func'

const props = defineProps<{
  deployPath: string
  disabled: boolean
  isDirty: boolean
}>()

const draft = defineModel<ValueSourcesDraft>({ required: true })

const valueSources = computed(() => draft.value.valueSources)
const externalRef = computed(() => draft.value.useExternalValues ? draft.value.externalValuesRef.ref : null)

function setValueSources(next: UpdateDeploymentValueSource[]) {
  draft.value = withValueSourceList(draft.value, next)
}

// Stable per-row keys, kept in lockstep with the array so reordering swaps rendered
// rows instead of relying on positional (index) keys, which break reactivity on move.
const rowKeys = ref<string[]>([])
function freshKey() {
  return getRandomId('value-source')
}

// Rebuild keys only when the array is replaced from the outside (initial load / edit,
// or the parent disabling external values), detected by a length mismatch.
// In-component mutations keep the lengths aligned.
watch(valueSources, (sources) => {
  if (rowKeys.value.length !== sources.length) {
    rowKeys.value = sources.map(freshKey)
  }
}, { immediate: true })

function addValueSource() {
  setValueSources([...valueSources.value, newInternalValueSource()])
  rowKeys.value = [...rowKeys.value, freshKey()]
}

// The modal's focus trap refocuses its first element (scrolling back to the top) when
// the focused node leaves the DOM, as a deleted row or a keyed move does. Parking focus
// on the list first keeps the trap on a node that stays.
const list = useTemplateRef<HTMLElement>('list')

function withFocusKept(change: () => void): Promise<void> {
  list.value?.focus({ preventScroll: true })
  change()
  return nextTick()
}

// Follows the moved row with focus, on the button the user pressed, or on the other
// one once the row reached an end of the list.
function focusMoveButton(rowKey: string | undefined, direction: -1 | 1) {
  const row = list.value?.querySelector(`[data-row-key="${rowKey}"]`)
  const [pressed, other] = direction === -1 ? ['move-up', 'move-down'] : ['move-down', 'move-up']
  const buttons = [pressed, other].map(action => row?.querySelector<HTMLButtonElement>(`[data-action="${action}"]`))
  buttons.find(button => button && !button.disabled)?.focus()
}

function remove(index: number) {
  withFocusKept(() => {
    setValueSources(valueSources.value.filter((_, i) => i !== index))
    rowKeys.value = rowKeys.value.filter((_, i) => i !== index)
  })
}

function move(index: number, direction: -1 | 1) {
  const nextSources = swapItems(valueSources.value, index, direction)
  // Same reference means the move fell off either end of the list: nothing to do.
  if (nextSources === valueSources.value) {
    return
  }

  // Swap the source and its key together so the row keeps its identity as it moves.
  const movedKey = rowKeys.value[index]
  withFocusKept(() => {
    setValueSources(nextSources)
    rowKeys.value = swapItems(rowKeys.value, index, direction)
  }).then(() => focusMoveButton(movedKey, direction))
}

function update(index: number, value: UpdateDeploymentValueSource) {
  setValueSources(valueSources.value.map((valueSource, i) => i === index ? value : valueSource))
}
</script>

<template>
  <div ref="list" tabindex="-1" class="w-full flex flex-col gap-2 outline-none mbs-3">
    <h6 class="fr-mb-0 fr-text--sm">
      Fichiers de valeurs
    </h6>

    <p v-if="valueSources.length === 0" class="fr-text--xs fr-text-mention--grey fr-mb-0">
      Aucun fichier : le fichier <code class="fr-text--xs fr-mb-0">values.yaml</code> du dépôt est utilisé par défaut.
    </p>

    <DeploymentValueSourceOption
      v-for="(valueSource, index) in valueSources"
      :key="rowKeys[index]"
      :data-row-key="rowKeys[index]"
      :model-value="valueSource"
      :position="index + 1"
      :external-ref="externalRef"
      :deploy-path="props.deployPath"
      :disabled="props.disabled"
      :is-dirty="props.isDirty"
      :can-delete="true"
      :can-move-up="index > 0"
      :can-move-down="index < valueSources.length - 1"
      :is-highest-priority="valueSources.length > 1 && index === valueSources.length - 1"
      @update:model-value="(value: UpdateDeploymentValueSource) => update(index, value)"
      @delete="remove(index)"
      @move-up="move(index, -1)"
      @move-down="move(index, 1)"
    />

    <p v-if="valueSources.length > 0" class="fr-text--xs fr-text-mention--grey fr-mb-0">
      Liste ordonnée, optionnelle : chaque source surcharge les précédentes.
    </p>

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
