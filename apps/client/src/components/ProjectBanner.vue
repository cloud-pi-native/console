<script lang="ts" setup>
import type { Project, ProjectOperations } from '@/utils/project-utils.js'
import { bts, descriptionMaxLength, projectIsLockedInfo } from '@cpn-console/shared'
import { copyContent } from '@/utils/func.js'

const props = withDefaults(defineProps<{
  project: Project
  canEditDescription?: boolean
}>(), {
  canEditDescription: false,
})

const emits = defineEmits<{
  saveDescription: [description: string]
}>()

const isEditingDescription = ref(false)

function getDynamicTitle(locked?: Project['locked'], description?: Project['description']) {
  if (locked) return projectIsLockedInfo
  if (description) return 'Editer la description'
  return 'Ajouter une description'
}

// Local draft: the project entity belongs to the store, so this component
// never writes to it. The parent persists the value on `saveDescription`.
const descriptionDraft = ref(props.project.description ?? '')

watch(() => props.project.description, (description) => {
  if (isEditingDescription.value) return
  descriptionDraft.value = description ?? ''
})

function saveDescription() {
  emits('saveDescription', descriptionDraft.value)
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
          v-model="descriptionDraft"
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
            :icon="(project.operationsInProgress as unknown as ProjectOperations[]).includes('update')
              ? { name: 'ri:refresh-line', animation: 'spin' }
              : 'ri:send-plane-line'"
            :disabled="(project.operationsInProgress as unknown as ProjectOperations[]).includes('update')"
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
          aria-label="Modifier la description du projet"
          icon-only
          secondary
          @click="isEditingDescription = true"
        />
      </div>
    </div>

    <!-- Section technique -->
    <div class="flex flex-col gap-2 items-end">
      <div class="flex flex-row">
        <button
          type="button"
          class="bg-transparent border-none p-0 cursor-pointer"
          data-testid="project-slug"
          aria-label="Copier le slug du projet"
          @click="copyContent(project.slug)"
        >
          <code class="fr-text-default--info text-sm">slug:&nbsp;{{ project.slug }}</code>
        </button>
        <div
          title="Slug du projet, nom technique garantissant l'unicité"
          class="ml-2 inline"
          role="note"
          tabindex="0"
          aria-label="Slug du projet, nom technique garantissant l'unicité"
        >
          <v-icon
            name="ri:question-line"
            aria-hidden="true"
          />
        </div>
      </div>
      <div class="flex flex-row">
        <button
          type="button"
          class="bg-transparent border-none p-0 cursor-pointer"
          :title="project.id"
          data-testid="project-id"
          aria-label="Copier l’identifiant du projet"
          @click="copyContent(project.id)"
        >
          <code class="fr-text-default--info text-sm">Id:&nbsp;...{{ project.id.slice(-5) }}</code>
        </button>
        <div
          title="Id du projet, uuid"
          class="ml-2 inline"
          role="note"
          tabindex="0"
          aria-label="Id du projet, uuid"
        >
          <v-icon
            name="ri:question-line"
            aria-hidden="true"
          />
        </div>
      </div>
      <div
        v-if="project.lastSuccessProvisionningVersion"
        class="flex flex-row"
      >
        <button
          type="button"
          class="bg-transparent border-none p-0 cursor-pointer"
          aria-label="Copier la version de provisionnement"
          @click="copyContent(project.lastSuccessProvisionningVersion)"
        >
          <code class="fr-text-default--info text-sm">Version:&nbsp;{{ project.lastSuccessProvisionningVersion }}</code>
        </button>
        <div
          title="Version de la console lors du dernier provisionnement réussi du projet"
          class="ml-2 inline"
          role="note"
          tabindex="0"
          aria-label="Version de la console lors du dernier provisionnement réussi du projet"
        >
          <v-icon
            name="ri:question-line"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>
