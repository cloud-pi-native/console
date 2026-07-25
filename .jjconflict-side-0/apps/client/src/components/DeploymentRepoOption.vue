<script setup lang="ts">
import type { UpdateDeployment } from '@cpn-console/shared'
import { DeploymentSourceSchema } from '@cpn-console/shared'

withDefaults(defineProps<{
  cantDelete: boolean
  options: { text: string, value: string }[]
  disabled?: boolean
  isDirty?: boolean
}>(), {
  options: () => [],
  cantDelete: false,
  disabled: false,
  isDirty: false,
})
defineEmits<{ delete: [] }>()

const model = defineModel<Partial<UpdateDeployment['deploymentSources'][0]>>(
  {
    default: {
      id: undefined,
      type: 'git',
      repositoryId: undefined,
      targetRevision: undefined,
      path: undefined,
      helmValuesFiles: undefined,
    },
  },
)
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
    <DsfrInputGroup
      v-model="model.helmValuesFiles"
      class="mb-2"
      is-textarea
      label="Fichiers values (Helm)"
      label-visible
      hint="Un fichier par ligne, chemin relatif par rapport au répertoire à déployer. L'ordre des fichiers est déterminant pour la surcharge des valeurs communes. Champ optionnel."
      placeholder="values/extra.yaml
values-<env>/custom.yaml"
      :disabled="$props.disabled"
    />
  </div>
</template>

<style lang="css" scoped>
.fr-select-group,
.fr-input-group {
  margin-bottom: .75rem;
}
</style>
