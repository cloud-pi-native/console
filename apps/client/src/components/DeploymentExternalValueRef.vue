<script setup lang="ts">
import type { WritableDeploymentExternalValuesRef } from '@cpn-console/shared'
import { toStringValue } from '@/utils/func'

const props = defineProps<{
  repoOptions: { text: string, value: string }[]
  disabled: boolean
  isDirty: boolean
}>()

const externalValuesRef = defineModel<WritableDeploymentExternalValuesRef>({ required: true })

function update(patch: Partial<WritableDeploymentExternalValuesRef>) {
  externalValuesRef.value = { ...externalValuesRef.value, ...patch }
}
</script>

<template>
  <div class="w-full py-3 px-4 border border-solid border-gray-200 flex flex-col gap-2">
    <DsfrSelect
      :model-value="externalValuesRef.repositoryId || undefined"
      label="Dépôt de valeurs externes"
      :options="props.repoOptions"
      required
      :disabled="props.disabled"
      :error-message="props.isDirty && !externalValuesRef.repositoryId ? 'Le dépôt de valeurs est requis' : undefined"
      @update:model-value="(value: string | number) => update({ repositoryId: toStringValue(value) })"
    />
    <DsfrInputGroup
      :model-value="externalValuesRef.ref"
      label="Nom de la source (ref)"
      label-visible
      placeholder="values"
      hint="Nom court (ref) donné au dépôt de valeurs pour qu'ArgoCD le référence, utilisé comme $ref dans les chemins."
      required
      :disabled="props.disabled"
      :error-message="props.isDirty && !externalValuesRef.ref ? 'Le nom de la référence est requis' : undefined"
      @update:model-value="(value: string | number | undefined) => update({ ref: toStringValue(value) })"
    />
    <DsfrInputGroup
      :model-value="externalValuesRef.targetRevision"
      label="Révision (branche, tag, commit)"
      label-visible
      placeholder="HEAD"
      :disabled="props.disabled"
      @update:model-value="(value: string | number | undefined) => update({ targetRevision: toStringValue(value) })"
    />
  </div>
</template>

<style lang="css" scoped>
.fr-select-group,
.fr-input-group {
  margin-bottom: .5rem;
}
</style>
