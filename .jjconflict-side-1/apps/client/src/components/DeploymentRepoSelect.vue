<script lang="ts" setup>
import type { UpdateDeployment } from '@cpn-console/shared'

withDefaults(defineProps<{
  repoOptions: { text: string, value: string }[]
  disabled?: boolean
  isDirty?: boolean
}>(), { disabled: false, isDirty: false })

const depots = defineModel<Partial<UpdateDeployment['deploymentSources'][0]>[]>({ default: [] })

if (depots.value.length === 0) {
  addDepot()
}

function addDepot() {
  depots.value = [
    ...depots.value,
    {
      id: undefined,
      type: 'git',
      repositoryId: undefined,
      targetRevision: undefined,
      path: undefined,
      helmValuesFiles: undefined,
    },
  ]
}

function removeDepot(index: number) {
  depots.value = depots.value.filter((_, i) => i !== index)
}

function updateDepot(index: number, value: Partial<UpdateDeployment['deploymentSources'][0]>) {
  depots.value[index] = value
}
</script>

<template>
  <div class="p-2">
    <div class="w-full flex flex-col gap-2">
      <DeploymentRepoOption
        v-for="(depot, index) in depots"
        :key="depot.id ?? `new-${index}`"
        :model-value="depot"
        :options="$props.repoOptions"
        class="w-full py-2 px-4 border border-solid border-gray-300"
        :cant-delete="index === 0"
        :disabled="$props.disabled"
        :is-dirty="$props.isDirty"
        @update:model-value="(value :Partial<UpdateDeployment['deploymentSources'][0]>) => updateDepot(index, value)"
        @delete="removeDepot(index)"
      />
    </div>
    <div v-if="!$props.disabled" class="w-full flex mt-4">
      <DsfrButton
        type="button"
        label="Ajouter un dépôt"
        icon="ri:add-line"
        secondary
        @click="addDepot"
      />
    </div>
  </div>
</template>
