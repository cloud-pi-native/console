<script lang="ts" setup>
import type { Project } from '@/utils/project-utils'
import { descriptionMaxLength, projectIsLockedInfo, bts } from '@cpn-console/shared'
import { copyContent } from '@/utils/func'

withDefaults(defineProps<{
  project: Project
  canEditDescription?: boolean
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
    class="fr-callout flex flex-row"
  >
    <div
      class="grow"
    >
      <div class="flex flex-row items-center gap-3">
        <!-- Section nom -->
        <h1
          class="fr-callout__title inline"
        >
          {{ project.name }}
        </h1>
        <div class="flex flex-row gap-2">
          <DsoBadge
            class="inline"
            :resource="{
              ...project,
              locked: bts(project.locked),
              resourceKey: 'locked',
              wording: '',
            }"
          />
          <DsoBadge
            class="inline"
            :resource="{
              ...project,
              resourceKey: 'status',
              wording: '',
            }"
          />
        </div>
      </div>

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
    </div>

    <!-- Section technique -->
    <div class="flex flex-col gap-2 items-end">
      <div class="flex flex-row">
        <code
          class="fr-text-default--info text-sm"
          @click="copyContent(project.slug)"
        >slug:&nbsp;{{ project.slug }}</code>
        <div
          title="Slug du projet, nom technique garantissant l'unicité"
          class="ml-2 inline"
        >
          <v-icon
            name="ri:question-line"
          />
        </div>
      </div>
      <div class="flex flex-row">
        <code
          class="fr-text-default--info text-sm"
          :title="project.id"
          @click="copyContent(project.id)"
        >Id:&nbsp;...{{ project.id.slice(-5) }}</code>
        <div
          title="Id du projet, uuid"
          class="ml-2 inline"
        >
          <v-icon
            name="ri:question-line"
          />
        </div>
      </div>
      <div
        v-if="project.lastSuccessProvisionningVersion"
        class="flex flex-row"
      >
        <code
          class="fr-text-default--info text-sm"
          @click="copyContent(project.lastSuccessProvisionningVersion)"
        >Version:&nbsp;{{ project.lastSuccessProvisionningVersion }}
        </code>
        <div
          title="Version de la console lors du dernier provisionnement réussi du projet"
          class="ml-2 inline"
        >
          <v-icon
            name="ri:question-line"
          />
        </div>
      </div>
    </div>
  </div>
</template>
