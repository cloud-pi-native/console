<script setup>
import { ref, computed } from 'vue'
import { clusterSchema, schemaValidator, isValid, instanciateSchema } from 'shared'
import MultiSelector from './MultiSelector.vue'

const props = defineProps({
  cluster: {
    type: Object,
    default: () => ({
      name: '',
      server: '',
      config: '',
      secretName: undefined,
      projects: [],
      clusterResources: false,
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
// const clusterToDelete = ref('')
// const isDeletingCluster = ref(false)

const errorSchema = computed(() => schemaValidator(clusterSchema, localCluster.value))
const isClusterValid = computed(() => Object.keys(errorSchema.value).length === 0)

const updateValues = (key, value) => {
  localCluster.value[key] = value
  updatedValues.value[key] = true
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
      Ajouter un cluster
    </h1>
    <div class="fr-mb-2w w-full">
      <DsfrInputGroup
        v-model="localCluster.name"
        data-testid="nameInput"
        type="text"
        required="required"
        :error-message="!!updatedValues.name && !isValid(clusterSchema, localCluster, 'name') ? 'Le nom du cluster ne doit contenir ni espaces ni caractères spéciaux': undefined"
        label="Nom du cluster applicatif"
        label-visible
        hint="Nom du cluster applicatif utilisable lors des déploiements Argocd"
        placeholder="erpc-ovh"
        @update:model-value="updateValues('name', $event)"
      />
    </div>
    <div class="fr-mb-2w">
      <DsfrInputGroup
        v-model="localCluster.server"
        data-testid="serverInput"
        type="text"
        required="required"
        :error-message="!!updatedValues.server && !isValid(clusterSchema, localCluster, 'server') ? 'L\'url du cluster doit commencer par https': undefined"
        label="Serveur"
        label-visible
        hint="Url de l'api server du cluster (clé 'server' de la kubeconfig)"
        placeholder="https://my-cluster.com:6443"
        class="fr-mb-2w"
        @update:model-value="updateValues('server', $event)"
      />
    </div>
    <div class="fr-mb-2w">
      <DsfrInput
        v-model="localCluster.config"
        data-testid="configInput"
        required="required"
        :is-textarea="true"
        label="Config du cluster"
        label-visible
        class="h-50"
        hint="Configuration de connexion entre Argocd et le cluster."
        :placeholder="JSON.stringify({
          bearerToken: '<authentication token>',
          tlsClientConfig: {
            insecure: false,
            caData: '<base64 encoded certificate>'
          }
        })"
        @update:model-value="updateValues('config', $event)"
      />
    </div>
    <div
      v-if="!isNewCluster"
      class="fr-mb-2w"
    >
      <DsfrInput
        v-model="localCluster.secretName"
        data-testid="secretNameInput"
        label="Nom du secret"
        label-visible
        disabled
        hint="Nom du secret kubernetes portant les infos du cluster."
        placeholder="secret-name"
        @update:model-value="updateValues('secretName', $event)"
      />
    </div>
    <DsfrCheckbox
      v-model="localCluster.clusterResources"
      data-testid="clusterResourcesCbx"
      label="Ressources cluster"
      hint="Cochez la case si des ressources de type cluster peuvent être déployése par Argocd."
      name="isClusterResources"
      @update:model-value="updateValues('clusterResources', $event)"
    />
    <div class="fr-mb-2w">
      <MultiSelector
        :options="allProjects"
        :array="localCluster.projects"
        label="Nom du projet"
        description="Ajouter à la liste des projets autorisés à utiliser ce cluster."
        @update="updateValues('projects', $event)"
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
