<script setup lang="ts">
import type { UpdateDeployment } from '@cpn-console/shared'

withDefaults(defineProps<{
  cantDelete: boolean
  options: { text: string, value: string }[]
}>(), {
  options: () => [],
  cantDelete: false,
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
    <div v-if="!$props.cantDelete" class="flex w-full justify-end">
      <DsfrButton icon-only icon="ri:delete-bin-7-line" secondary @click="$emit('delete')" />
    </div>
    <DsfrSelect v-model="model.repositoryId" label="Dépôt" :options="$props.options" />
    <DsfrInputGroup
      v-model="model.targetRevision"
      class="mb-2"
      placeholder="HEAD"
      label="Nom de la révision à déployer (branche, tag, commit)"
      label-visible
    />
    <DsfrInputGroup
      v-model="model.path"
      class="mb-2"
      placeholder="manifest/"
      label="Chemin du répertoire à déployer"
      label-visible
    />
    <DsfrInputGroup
      v-model="model.helmValuesFiles"
      class="mb-2"
      is-textarea
      label="Fichiers values (Helm)"
      label-visible
      hint="Un fichier par ligne, chemin relatif par rapport au répertoire à déployer. La balise <env> sera remplacée par le nom de l'environnement. L'ordre des fichiers est déterminant pour la surcharge des valeurs communes. Champ optionnel."
      placeholder="values/extra.yaml
values-<env>/custom.yaml"
    />
  </div>
</template>

<style lang="css" scoped>
.fr-select-group,
.fr-input-group {
  margin-bottom: .75rem;
}
</style>
