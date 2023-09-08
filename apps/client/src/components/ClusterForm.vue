<script setup>
import { ref, computed, onBeforeMount, watch } from 'vue'
import { clusterSchema, schemaValidator, isValid, instanciateSchema } from '@dso-console/shared'
import { load } from 'js-yaml'
import { JsonViewer } from 'vue3-json-viewer'
import MultiSelector from './MultiSelector.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'

const snackbarStore = useSnackbarStore()

const props = defineProps({
  cluster: {
    type: Object,
    default: () => ({
      label: '',
      cluster: {},
      user: {},
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

const projectsName = ref([])
const jsonKConfig = ref({})
const kConfigError = ref(undefined)
const isMissingCurrentContext = ref(false)
const contexts = ref([])
const selectedContext = ref(undefined)
const localCluster = ref({})
const updatedValues = ref({})
const kubeconfig = ref()
// const clusterToDelete = ref('')
// const isDeletingCluster = ref(false)

const errorSchema = computed(() => schemaValidator(clusterSchema, localCluster.value))
const isClusterValid = computed(() => Object.keys(errorSchema.value).length === 0)

const updateValues = (key, value) => {
  localCluster.value[key] = value
  updatedValues.value[key] = true

  // Retrieve array of project names from child component, map it into array of project ids.
  if (key === 'projectsId') {
    localCluster.value.projectsId = localCluster.value.projectsId
      .map(project => {
        const organization = project.split(' - ')[0]
        const projectName = project.split(' - ')[1]
        return props.allProjects?.find(pFromAll => pFromAll.organization.name === organization && pFromAll.name === projectName).id
      })
  }
}

const updateKubeconfig = (files) => {
  kConfigError.value = undefined
  localCluster.value.cluster = undefined
  localCluster.value.user = undefined

  try {
    const reader = new FileReader()
    reader.onload = (evt) => {
      // Retrieve YAML kubeconfig, turn it to JSON object.
      jsonKConfig.value = load(evt.target.result, 'utf8')
      // Retrieve context.
      let context
      if (!jsonKConfig.value.contexts) throw new Error('Pas de contexts spécifiés dans le kubeconfig.')
      if (jsonKConfig.value['current-context']) {
        context = jsonKConfig.value.contexts.find(ctx => ctx.name === jsonKConfig.value['current-context']).context
        isMissingCurrentContext.value = false
        retrieveUserAndCluster(context)
      } else {
        contexts.value = jsonKConfig.value.contexts.map(context => context.name)
        isMissingCurrentContext.value = true
        snackbarStore.setMessage('Pas de current-context. Choisissez un contexte.')
      }
    }
    reader.readAsText(files[0])
  } catch (error) {
    kConfigError.value = error.message
    snackbarStore.setMessage(error.message, 'error')
  }
}

const retrieveUserAndCluster = (context) => {
  try {
    /**
     * Retrieve context user.
     * @typedef {Object} user
     * @property {string} username
     * @property {string} password
     * @property {string} token
     * @property {string} certData - client-certificate-data
     * @property {string} keyData - client-key-data
     */
    localCluster.value.user = jsonKConfig.value.users.find(user => user.name === context.user).user
    localCluster.value.user.certData = localCluster.value.user['client-certificate-data']
    delete localCluster.value.user['client-certificate-data']
    localCluster.value.user.keyData = localCluster.value.user['client-key-data']
    delete localCluster.value.user['client-key-data']
    /**
     * Retrieve context cluster.
     * @typedef {Object} cluster
     * @property {string} server - server
     * @property {string} tlsServerName - sni
     * @property {string} caData - certificate-authority-data
     *
     */
    localCluster.value.cluster = jsonKConfig.value.clusters.find(cluster => cluster.name === context.cluster).cluster
    localCluster.value.cluster.tlsServerName = localCluster.value.cluster.server.split('https://')[1].split(':')[0]
    localCluster.value.cluster.caData = localCluster.value.cluster['certificate-authority-data']
    delete localCluster.value.cluster['certificate-authority-data']
  } catch (error) {
    kConfigError.value = error.message
    snackbarStore.setMessage(error.message, 'error')
  }
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

onBeforeMount(() => {
  // Retrieve array of project ids from parent component, map it into array of project names and pass it to child component.
  localCluster.value = props.cluster
  projectsName.value = localCluster.value.projectsId.map(projectId => {
    const project = props.allProjects?.find(project => project.id === projectId)
    return `${project.organization.name} - ${project.name}`
  })
})

watch(selectedContext, () => {
  try {
    const context = jsonKConfig.value.contexts.find(ctx => ctx.name === jsonKConfig.value[selectedContext]).context
    if (!context) throw new Error('Le contexte semble vide.')
    retrieveUserAndCluster(context)
  } catch (error) {
    kConfigError.value = error.message
    if (error.message === 'Cannot read properties of undefined (reading \'context\')') {
      snackbarStore.setMessage('Le contexte semble vide.', 'error')
      return
    }
    snackbarStore.setMessage(error.message, 'error')
  }
})

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
      data-testid="kubeconfig-upload"
      :disabled="!isNewCluster"
      :error="kConfigError || (errorSchema.cluster?.match(/is required$/) || errorSchema.user?.match(/is required$/) ? 'Le kubeconfig semble incomplet.' : '')"
      hint="Uploadez le Kubeconfig du cluster."
      class="fr-mb-2w"
      @change="updateKubeconfig($event)"
    />
    <DsfrSelect
      v-if="isMissingCurrentContext"
      v-model="selectedContext"
      :disabled="!isNewCluster"
      select-id="selectedContextSelect"
      label="Context"
      description="Nous n'avons pas trouvé de current-context dans votre kubeconfig. Veuillez choisir un contexte."
      :options="contexts"
    />
    <JsonViewer
      v-show="localCluster.user"
      data-testid="user-json"
      :value="localCluster.user"
      class="json-box"
      copyable
      boxed
    />
    <JsonViewer
      v-show="localCluster.cluster"
      data-testid="cluster-json"
      :value="localCluster.cluster"
      class="json-box"
      copyable
      boxed
    />
    <div class="fr-mb-2w w-full">
      <DsfrInputGroup
        v-model="localCluster.label"
        data-testid="labelInput"
        type="text"
        :disabled="!isNewCluster"
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
      select-id="privacy-select"
      label="Confidentialité du cluster"
      :options="['dedicated', 'public']"
    />
    <div
      v-if="localCluster.privacy === 'dedicated'"
      class="fr-mb-2w"
    >
      <MultiSelector
        :options="allProjects.map(project => ({ id: project.id, name: `${project.organization.name} - ${project.name}` }))"
        :array="projectsName"
        :disabled="!allProjects.length"
        no-choice-label="Aucun projet disponible"
        choice-label="Veuillez choisir les projets à associer"
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
      <div class="danger-zone-btns">
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
