<script lang="ts" setup>
import type { Cluster, Deployment, Environment, Stage, UpdateDeployment, Zone } from '@cpn-console/shared'
import type { DsfrRadioButtonProps } from '@gouvminint/vue-dsfr'
import type { Project } from '@/utils/project-utils.js'
import { CreateDeploymentSchema, DeploymentSchema } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = withDefaults(defineProps<{
  opened: boolean
  environments: (Environment & { cluster?: Cluster, zone?: Zone, stage?: Stage })[]
  repoOptions: { text: string, value: string }[]
  deployment?: Deployment
  project: Project
}>(), { opened: false })

const emit = defineEmits<{ close: [] }>()

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

const deployment = ref<Partial<UpdateDeployment & { id: string }>>(
  props.deployment ? { ...props.deployment } : { projectId: props.project.id, autosync: true },
)

watch(() => props.deployment, (newValue) => {
  deployment.value = newValue ? { ...newValue } : { projectId: props.project.id, autosync: true }
}, { deep: true })

const deploymentSourcesModel = computed({
  get: () => deployment.value?.deploymentSources ?? [],
  set: (value: UpdateDeployment['deploymentSources']) =>
    deployment.value = { ...deployment.value, deploymentSources: value },
})

const isLoading = ref(false)

function upsertDeployment() {
  if (isLoading.value) return

  const body = CreateDeploymentSchema.safeParse(deployment.value)
  if (!body.success) {
    snackbarStore.setMessage(body.error.message, 'error')
    return
  }

  isLoading.value = true
  if (deployment.value.id) {
    props.project.Deployments.update(deployment.value.id, body.data)
      .then(closeModal)
      .catch(reason => snackbarStore.setMessage(reason, 'error'))
      .finally(() => isLoading.value = false)
  } else {
    props.project.Deployments.create(body.data)
      .then(closeModal)
      .catch(reason => snackbarStore.setMessage(reason, 'error'))
      .finally(() => isLoading.value = false)
  }
}

function closeModal() {
  deployment.value = { projectId: props.project.id, autosync: true }
  emit('close')
}
</script>

<template>
  <DsfrModal title="" :opened is-alert @close="closeModal">
    <div class="w-full">
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
          :error-message="!!deployment.name && !DeploymentSchema.pick({ name: true }).safeParse({ name: deployment.name }).success ? `Le nom du déploiement ne doit pas contenir d\'espace, doit être unique pour le projet et le cluster sélectionnés, être en minuscules.` : undefined"
          placeholder="deploy0"
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
      />

      <h6 class="fr-mb-0">
        Dépôts à inclure
      </h6>
      <DeploymentRepoSelect v-model="deploymentSourcesModel" :repo-options="repoOptions" />
    </div>
    <div class="w-full flex justify-end gap-4">
      <DsfrButton
        label="Enregistrer"
        primary
        size="md"
        :icon="isLoading ? { name: 'ri:loader-4-line', animation: 'spin' } : undefined"
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
  </DsfrModal>
</template>
