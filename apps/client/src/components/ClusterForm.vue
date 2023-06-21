<script setup>
import { ref, computed } from 'vue'
import { clusterSchema, schemaValidator, isValid, instanciateSchema } from 'shared'
import MultiSelector from './MultiSelector.vue'

// zone upload de fichier de type kubeconfig format yaml
// user: UserAuthBasic | UserAuthCerts | UserAuthToken => à parser du fichier uploadé
// cluster: Pick<Cluster, 'name' | 'caData' | 'server' | 'tlsServerName'> => à parser du fichier uploadé

const props = defineProps({
  cluster: {
    type: Object,
    default: () => ({
      label: '',
      cluster: '',
      user: '',
      projectsId: [],
      clusterResources: false,
      privacy: 'dedicated',
    }),
  },
  isNewCluster: {
    type: Boolean,
    default: true,
  },
  allProjects: {
    type: Array,
    default: () => [],
  },
})

const localCluster = ref(props.cluster)
const updatedValues = ref({})
const kubeconfig = ref()
// const clusterToDelete = ref('')
// const isDeletingCluster = ref(false)

const errorSchema = computed(() => schemaValidator(clusterSchema, localCluster.value))
const isClusterValid = computed(() => Object.keys(errorSchema.value).length === 0)

const updateValues = (key, value) => {
  localCluster.value[key] = value
  updatedValues.value[key] = true

  /**
    * Retrieve array of project names form child component, map it into array of project ids.
    */
  if (key === 'projectsId') {
    localCluster.value.projectsId = localCluster.value.projectsId
      .map(project => props.allProjects
        ?.find(pFromAll => pFromAll.name === project).id)
  }
}

const updateKubeconfig = (event) => {
  console.log({ event })
}

const emit = defineEmits(['add', 'update', 'delete', 'cancel'])

const addCluster = () => {
  updatedValues.value = instanciateSchema({ schema: clusterSchema }, true)
  if (isClusterValid.value) emit('add', localCluster.value)
}

const updateCluster = () => {
  updatedValues.value = instanciateSchema({ schema: clusterSchema }, true)
  if (isClusterValid.value) emit('update', localCluster.value)
}

const cancel = (event) => {
  emit('cancel', event)
}

</script>

<template>
  <div
    data-testid="cluster-form"
  >
    <h1
      class="fr-h1"
    >
      {{ isNewCluster ? 'Ajouter un cluster' : 'Mettre à jour le cluster' }}
    </h1>
    <DsfrFileUpload
      v-model="kubeconfig"
      label="Kubeconfig"
      hint="Uploadez le Kubeconfig du cluster."
      class="fr-mb-2w"
      @update:model-value="updateKubeconfig($event)"
    />
    <div class="fr-mb-2w w-full">
      <DsfrInputGroup
        v-model="localCluster.label"
        data-testid="labelInput"
        type="text"
        required="required"
        :error-message="!!updatedValues.label && !isValid(clusterSchema, localCluster, 'label') ? 'Le nom du cluster ne doit contenir ni espaces ni caractères spéciaux': undefined"
        label="Nom du cluster applicatif"
        label-visible
        hint="Nom du cluster applicatif utilisable lors des déploiements Argocd."
        placeholder="erpc-ovh"
        @update:model-value="updateValues('label', $event)"
      />
    </div>
    <DsfrCheckbox
      v-model="localCluster.clusterResources"
      data-testid="clusterResourcesCbx"
      label="Ressources cluster"
      hint="Cochez la case si des ressources de type cluster peuvent être déployées par Argocd."
      name="isClusterResources"
      @update:model-value="updateValues('clusterResources', $event)"
    />
    <DsfrSelect
      v-model="localCluster.privacy"
      label="Confidentialité du cluster"
      :options="['dedicated', 'public']"
      data-testid="privacySelect"
    />
    <div class="fr-mb-2w">
      <MultiSelector
        :options="allProjects"
        :array="localCluster.projectsId"
        label="Nom des projets"
        description="Sélectionnez les projets autorisés à utiliser ce cluster."
        @update="updateValues('projectsId', $event)"
      />
    </div>
    <div
      class="flex space-x-10 mt-5"
    >
      <DsfrButton
        v-if="isNewCluster"
        label="Ajouter le cluster"
        data-testid="addClusterBtn"
        :disabled="!isClusterValid"
        primary
        icon="ri-upload-cloud-line"
        @click="addCluster()"
      />
      <DsfrButton
        v-else
        label="Mettre à jour le cluster"
        data-testid="updateClusterBtn"
        :disabled="!isClusterValid"
        primary
        icon="ri-upload-cloud-line"
        @click="updateCluster()"
      />
      <DsfrButton
        label="Annuler"
        data-testid="cancelClusterBtn"
        secondary
        icon="ri-close-line"
        @click="cancel()"
      />
    </div>
    <!-- TODO: Activer la suppression de cluster -->
    <div
      v-if="false"
      data-testid="deleteClusterZone"
      class="danger-zone"
    >
      <div class="flex justify-between items-center <md:flex-col">
        <DsfrButton
          v-show="!isDeletingCluster"
          data-testid="showDeleteClusterBtn"
          :label="`Supprimer le cluster ${localCluster.name}`"
          secondary
          icon="ri-delete-bin-7-line"
          @click="isDeletingCluster = true"
        />
        <DsfrAlert
          class="<md:mt-2"
          description="Le retrait d'un cluster est irréversible."
          type="warning"
          small
        />
      </div>
      <div
        v-if="isDeletingCluster"
        class="fr-mt-4w"
      >
        <DsfrInput
          v-model="clusterToDelete"
          data-testid="deletClusterInput"
          :label="`Veuillez taper '${localCluster.name}' pour confirmer la suppression du cluster`"
          label-visible
          :placeholder="localCluster.name"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            data-testid="deleteClusterBtn"
            :label="`Supprimer définitivement le cluster ${localCluster.name}`"
            :disabled="clusterToDelete !== localCluster.name"
            :title="`Supprimer définitivement le cluster ${localCluster.name}`"
            secondary
            icon="ri-delete-bin-7-line"
            @click="$emit('delete', localCluster.id)"
          />
          <DsfrButton
            label="Annuler"
            primary
            @click="isDeletingCluster = false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
