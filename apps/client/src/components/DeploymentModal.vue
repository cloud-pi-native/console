<script lang="ts" setup>
import type {
  Cluster,
  Deployment,
  Environment,
  Stage,
  UpdateDeployment,
  UpdateDeploymentSource,
  Zone,
} from '@cpn-console/shared'
import type { DsfrRadioButtonProps } from '@gouvminint/vue-dsfr'
import type { Project } from '@/utils/project-utils.js'
import { CreateDeploymentSchema, DeploymentSchema, longestDeploymentName, UpdateDeploymentSchema } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar'
import { toDeploymentDraft } from '@/utils/deployment-draft'
import { scrollToFirstError } from '@/utils/func'

const props = defineProps<{
  opened: boolean
  environments: (Environment & { cluster?: Cluster, zone?: Zone, stage?: Stage })[]
  repoOptions: { text: string, value: string }[]
  deployment?: Deployment
  project: Project
  disabled: boolean
}>()

const emit = defineEmits<{ close: [], changed: [] }>()

const snackbarStore = useSnackbarStore()

const { opened } = toRefs(props)

const options: ComputedRef<Omit<DsfrRadioButtonProps, 'modelValue'>[]> = computed(
  () => props.environments.map(env => ({
    hint: env.stage?.name,
    label: env.name,
    value: env.id,
    class: 'fr-p-0',
  })),
)

function toDraft(source?: Deployment) {
  return source ? toDeploymentDraft(source) : { projectId: props.project.id, autosync: true }
}

const deployment = ref<Partial<UpdateDeployment & { id: string }>>(toDraft(props.deployment))

// Also watch `opened`: reopening the same card leaves props.deployment identical,
// so the form must be rebuilt on open, not only when the selection changes.
watch([() => props.deployment, () => props.opened], ([newValue, isOpened]) => {
  if (!isOpened) return
  deployment.value = toDraft(newValue)
}, { deep: true, immediate: true })

const deploymentSourcesModel = computed({
  get: () => deployment.value?.deploymentSources ?? [],
  set: (value: UpdateDeploymentSource[]) =>
    deployment.value = { ...deployment.value, deploymentSources: value },
})

const isLoading = ref(false)
const isDeleting = ref(false)
const isDirty = ref(false)

const formContainer = ref<HTMLDivElement | null>(null)

const isNew = computed(() => !deployment.value.id)

const nameErrorMessage = computed(() => {
  if (!deployment.value.name && !isDirty.value) return undefined
  if (DeploymentSchema.pick({ name: true }).safeParse({ name: deployment.value.name }).success) return undefined
  return `Le nom du déploiement est requis et ne doit pas contenir d'espace, doit être unique pour le projet et le cluster sélectionnés, être en minuscules et faire plus de 2 et moins de ${longestDeploymentName} caractères.`
})

const environmentErrorMessage = computed(() => {
  if (!deployment.value.environmentId && !isDirty.value) return undefined
  if (DeploymentSchema.pick({ environmentId: true }).safeParse({ environmentId: deployment.value.environmentId }).success) return undefined
  return `L'environnement est requis`
})

function upsertDeployment() {
  if (isLoading.value) return

  const id = deployment.value.id
  const body = id
    ? UpdateDeploymentSchema.safeParse(deployment.value)
    : CreateDeploymentSchema.safeParse(deployment.value)

  if (!body.success) {
    isDirty.value = true
    scrollToFirstError(formContainer)
    return
  }

  const request = id
    ? props.project.Deployments.update(id, body.data)
    : props.project.Deployments.create(body.data)

  isLoading.value = true
  request
    .then(() => {
      emit('changed')
      closeModal()
      snackbarStore.setMessage('Déploiement enregistré, opérations en cours en arrière-plan...')
    })
    .catch((error: string) => snackbarStore.setMessage(error, 'error'))
    .finally(() => isLoading.value = false)
}

function deleteDeployment() {
  if (isDeleting.value || !deployment.value.id) return

  isDeleting.value = true
  props.project.Deployments.delete(deployment.value.id)
    .then(() => {
      emit('changed')
      closeModal()
      snackbarStore.setMessage('Suppression du déploiement enregistrée, opérations en cours en arrière-plan...')
    })
    .catch(error => snackbarStore.setMessage(error, 'error'))
    .finally(() => isDeleting.value = false)
}

function closeModal() {
  isDirty.value = false
  deployment.value = { projectId: props.project.id, autosync: true }
  emit('close')
}
</script>

<template>
  <DsfrModal title="" :opened is-alert @close="closeModal">
    <div ref="formContainer" class="w-full">
      <h4>
        <template v-if="deployment.id">
          Modifier le déploiement
        </template>
        <template v-else>
          Ajouter un déploiement au projet
        </template>
      </h4>

      <div class="w-full">
        <DsfrInputGroup
          v-model="deployment.name"
          label="Nom du déploiement"
          class="fr-mb-2v"
          label-visible
          :required="true"
          :error-message="nameErrorMessage"
          placeholder="deploy0"
          :disabled="props.disabled"
          :hint="`Ne doit pas contenir d'espace ni de trait d'union, doit être unique pour le projet et le cluster sélectionnés, être en minuscules et faire plus de 2 et moins de ${longestDeploymentName} caractères.`"
        />
      </div>

      <h6 class="fr-mb-0">
        Environnement cible
      </h6>
      <p class="fr-text--sm fr-text-mention--grey fr-mb-0">
        Un déploiement est lié à exactement 1 environnement
      </p>
      <DsfrRadioButtonSet
        v-model="deployment.environmentId"
        :options="options"
        :rich="true"
        :required="true"
        :disabled="props.disabled"
        :error-message="environmentErrorMessage"
      />

      <h6 class="fr-mb-0">
        Dépôts à inclure
      </h6>
      <DeploymentRepoSelect
        v-model="deploymentSourcesModel"
        :is-dirty
        :repo-options="repoOptions"
        :disabled="props.disabled"
      />
    </div>
    <div class="w-full flex justify-end gap-4">
      <DsfrButton
        v-if="!props.disabled"
        label="Enregistrer"
        primary
        size="md"
        :icon="isLoading ? { name: 'ri:refresh-line', animation: 'spin' } : undefined"
        :icon-right="isLoading"
        @click="upsertDeployment"
      />
      <DsfrButton
        label="Annuler"
        secondary
        size="md"
        @click="closeModal"
      />
    </div>
    <DeleteForm v-if="!isNew && !props.disabled" :is-loading="isDeleting" @delete="deleteDeployment" />
  </DsfrModal>
</template>
