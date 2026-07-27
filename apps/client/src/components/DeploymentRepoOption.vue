<script setup lang="ts">
import type { UpdateDeploymentSource } from '@cpn-console/shared'
import { DeploymentSourceSchema } from '@cpn-console/shared'

type DeploymentSourceDraft = Partial<UpdateDeploymentSource>

const props = withDefaults(defineProps<{
  cantDelete: boolean
  options: { text: string, value: string }[]
  disabled: boolean
  isDirty: boolean
}>(), {
  options: () => [],
})
defineEmits<{ delete: [] }>()

const model = defineModel<DeploymentSourceDraft>(
  {
    default: {
      type: 'git',
      valueSources: [],
    },
  },
)

const valueSourceRepoOptions = computed(() => props.options.filter(option => option.value !== model.value.repositoryId))
</script>

<template>
  <div class="w-full">
    <div v-if="!($props.cantDelete || $props.disabled)" class="flex w-full justify-end">
      <DsfrButton icon-only icon="ri:delete-bin-7-line" secondary @click="$emit('delete')" />
    </div>
    <DsfrSelect v-model="model.repositoryId" label="Dépôt" :options="$props.options" required :disabled="$props.disabled" :error-message="$props.isDirty && !DeploymentSourceSchema.pick({ repositoryId: true }).safeParse({ repositoryId: model.repositoryId }).success ? 'Le dépôt est requis' : undefined" />
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
    <DeploymentValueSources
      v-model="model.valueSources"
      :repo-options="valueSourceRepoOptions"
      :disabled="$props.disabled"
      :is-dirty="$props.isDirty"
    />
  </div>
</template>

<style lang="css" scoped>
.fr-select-group,
.fr-input-group {
  margin-bottom: .75rem;
}
</style>
