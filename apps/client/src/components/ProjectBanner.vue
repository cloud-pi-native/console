<script lang="ts" setup>
import type { Project } from '@/utils/project-utils.js'
import { descriptionMaxLength, projectIsLockedInfo } from '@cpn-console/shared'

withDefaults(defineProps<{
  project: Project
  canEditDescription: boolean
}>(), {
  canEditDescription: false,
})

const emits = defineEmits<{
  (e: 'update:modelValue'): void
  (e: 'saveDescription'): void
}>()

const isEditingDescription = ref(false)

function getDynamicTitle(locked?: Project['locked'], description?: Project['description']) {
  if (locked) return projectIsLockedInfo
  if (description) return 'Editer la description'
  return 'Ajouter une description'
}
const modelValue = defineModel<string>()

function saveDescription() {
  emits('saveDescription')
  isEditingDescription.value = false
}
</script>

<template>
  <div
    class="fr-callout"
  >
    <!-- Section nom -->
    <h1
      class="fr-callout__title fr-mb-3w"
    >
      {{ project.name }}<span class="fr-callout__title fr-mb-3w italic inline opacity-70">
        ({{ project.organization.label }})
      </span>
    </h1>

    <!-- Section description -->
    <div
      v-if="isEditingDescription"
    >
      <DsfrInput
        v-model="modelValue"
        data-testid="descriptionInput"
        :is-textarea="true"
        :maxlength="descriptionMaxLength"
        label="Description du projet"
        label-visible
        :hint="`Courte description expliquant la finalité du projet (${descriptionMaxLength} caractères maximum).`"
        placeholder="Application de réservation de places à l'examen du permis B."
      />
      <div
        class="flex justify-between"
      >
        <DsfrButton
          data-testid="saveDescriptionBtn"
          label="Enregistrer la description"
          secondary
          :icon="project.operationsInProgress.includes('update')
            ? { name: 'ri:refresh-line', animation: 'spin' }
            : 'ri:send-plane-line'"
          :disabled="project.operationsInProgress.includes('update')"
          @click="saveDescription"
        />
        <DsfrButton
          label="Annuler"
          primary
          @click="isEditingDescription = false"
        />
      </div>
    </div>
    <div
      v-else
      class="flex gap-4 items-center"
    >
      <p
        v-if="project.description"
        data-testid="descriptionP"
      >
        {{ project.description }}
      </p>
      <p
        v-else
        data-testid="descriptionP"
        class="disabled"
      >
        Aucune description pour le moment...
      </p>
      <DsfrButton
        v-if="canEditDescription"
        class="fr-mt-0"
        icon="ri:pencil-line"
        data-testid="setDescriptionBtn"
        :title="getDynamicTitle(project.locked, project.description)"
        icon-only
        secondary
        @click="isEditingDescription = true"
      />
    </div>

    <!-- Section version -->
    <div
      v-if="project.lastSuccessProvisionningVersion"
      title="Version de la console lors du dernier provisionnement réussi du projet"
    >
      <code
        class="fr-text-default--info text-sm"
      >Version:&nbsp;{{ project.lastSuccessProvisionningVersion }}</code>
    </div>
  </div>
</template>
