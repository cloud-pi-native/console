<script lang="ts" setup>
import type { UpdateDeployment } from '@cpn-console/shared'

defineProps<{
  repoOptions: { text: string, value: string }[]
}>()
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
        @update:model-value="value => updateDepot(index, value)"
        @delete="removeDepot(index)"
      />
    </div>
    <div class="w-full flex mt-4">
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
