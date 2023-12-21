<script lang="ts" setup>
import { ref, computed, onBeforeMount, watch, type Ref } from 'vue'
import { clusterSchema, schemaValidator, isValid, instanciateSchema } from '@dso-console/shared'
import { load } from 'js-yaml'
import { JsonViewer } from 'vue3-json-viewer'
import MultiSelector from './MultiSelector.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { handleError } from '@/utils/func.js'

const snackbarStore = useSnackbarStore()

const props = withDefaults(defineProps<{
  isNewCluster: boolean
  cluster: Record<string, any>
  allProjects: Array<any>
  allStages: Array<any>
  associatedEnvironments: Array<any>
}>(), {
  isNewCluster: true,
  cluster: () => ({
    label: '',
    cluster: {},
    user: {},
    projectIds: [],
    stageIds: [],
    clusterResources: false,
    privacy: 'dedicated',
    infos: '',
  }),
  allProjects: () => [],
  allStages: () => [],
  associatedEnvironments: () => [],
})

const projectsName: Ref<Array<string | never>> = ref([])
const stageNames: Ref<Array<string | never>> = ref([])
const jsonKConfig: Ref<Record<any, any>> = ref({})
const kConfigError: Ref<string | undefined> = ref(undefined)
const isMissingCurrentContext: Ref<boolean> = ref(false)
const contexts = ref([])
const selectedContext = ref(undefined)
const localCluster: Ref<Record<string, any>> = ref({})
const updatedValues: Ref<Record<string, any>> = ref({})
const kubeconfig = ref()
const clusterToDelete = ref('')
const isDeletingCluster = ref(false)

const errorSchema = computed(() => schemaValidator(clusterSchema, localCluster.value))
const isClusterValid = computed(() => Object.keys(errorSchema.value).length === 0)

const updateValues = (key: string, value: any) => {
  if (key === 'skipTLSVerify') {
    localCluster.value.cluster.skipTLSVerify = value
    updatedValues.value.cluster = true
    return
  }
  if (key === 'tlsServerName') {
    localCluster.value.cluster.tlsServerName = value
    updatedValues.value.cluster = true
    return
  }
  localCluster.value[key] = value
  updatedValues.value[key] = true

  // Retrieve array of project names from child component, map it into array of project ids.
  if (key === 'projectIds') {
    localCluster.value.projectIds = localCluster.value.projectIds
    // @ts-ignore
      .map(project => {
        const organization = project.split(' - ')[0]
        const projectName = project.split(' - ')[1]
        return props.allProjects?.find(pFromAll => pFromAll.organization.name === organization && pFromAll.name === projectName).id
      })
  }

  // Retrieve array of stage names from child component, map it into array of stage ids.
  if (key === 'stageIds') {
    localCluster.value.stageIds = localCluster.value.stageIds
    // @ts-ignore
      .map(stageName => props.allStages?.find(sFromAll => sFromAll.name === stageName)?.id)
  }
}

const updateKubeconfig = (files: Array<any>) => {
  kConfigError.value = undefined
  localCluster.value.cluster = {}
  localCluster.value.user = {}

  try {
    const reader = new FileReader()
    reader.onload = (evt) => {
      // Retrieve YAML kubeconfig, turn it to JSON object.
      if (evt.target) jsonKConfig.value = load(evt.target.result, 'utf8')
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
    handleError(error)
    // @ts-ignore
    kConfigError.value = error?.message
  }
}

type ContextType = {
  user: {
    username: string,
    password: string,
    token: string,
    certData: string,
    keyData: string,
  }
  cluster: {
    server: string,
    tlsServerName: string,
    caData: string,
    skipTLSVerify: string,
  }
}

const retrieveUserAndCluster = (context: ContextType) => {
  try {
    const currentUser = jsonKConfig.value.users.find(user => user.name === context.user).user

    localCluster.value.user = {
      ...currentUser?.username && { username: currentUser.username },
      ...currentUser?.password && { password: currentUser.password },
      ...currentUser?.token && { token: currentUser.token },
      ...currentUser?.['client-certificate-data'] && { certData: currentUser['client-certificate-data'] },
      ...currentUser?.['client-key-data'] && { keyData: currentUser['client-key-data'] },
    }

    const currentCluster = jsonKConfig.value.clusters.find(cluster => cluster.name === context.cluster).cluster
    localCluster.value.cluster = {
      server: currentCluster.server,
      tlsServerName: currentCluster.server.split('https://')[1].split(':')[0],
      skipTLSVerify: currentCluster['insecure-skip-tls-verify'] || false,
      ...currentCluster?.['certificate-authority-data'] && { caData: currentCluster['certificate-authority-data'] },
    }
  } catch (error) {
    handleError(error)
    // @ts-ignore
    kConfigError.value = error?.message
  }
}

type AssociatedEnvironment = {
  organization: string,
  project: string,
  name: string,
}
const getRows = (associatedEnvironments: AssociatedEnvironment[]) => {
  return associatedEnvironments
    .map(associatedEnvironment => Object
      .values(associatedEnvironment)
      .map(value => ({
        component: 'code',
        text: value,
        title: 'Copier la valeur',
        class: 'fr-text-default--info text-xs cursor-pointer',
        // @ts-ignore
        onClick: () => copyContent(value),
      }),
      ),
    )
}

const emit = defineEmits<{
  add: [value: typeof localCluster.value]
  update: [value: typeof localCluster.value]
  delete: [value: typeof localCluster.value['id']]
  cancel: []
}>()

const addCluster = () => {
  updatedValues.value = instanciateSchema({ schema: clusterSchema }, true)
  if (isClusterValid.value) emit('add', localCluster.value)
}

const updateCluster = () => {
  updatedValues.value = instanciateSchema({ schema: clusterSchema }, true)
  if (isClusterValid.value) emit('update', localCluster.value)
}

const cancel = () => {
  emit('cancel')
}

onBeforeMount(() => {
  // Retrieve array of project ids from parent component, map it into array of project names and pass it to child component.
  localCluster.value = props.cluster
  projectsName.value = localCluster.value.projectIds.map(projectId => {
    const project = props.allProjects?.find(project => project.id === projectId)
    return `${project.organization.name} - ${project.name}`
  })

  // Retrieve array of stage ids from parent component, map it into array of stage names and pass it to child component.
  localCluster.value = props.cluster
  stageNames.value = localCluster.value.stageIds?.map(stageId => props.allStages?.find(stage => stage.id === stageId)?.name)
})

watch(selectedContext, () => {
  try {
    const context = jsonKConfig.value.contexts.find(ctx => ctx.name === jsonKConfig.value[selectedContext]).context
    if (!context) throw new Error('Le contexte semble vide.')
    retrieveUserAndCluster(context)
  } catch (error) {
    if (error instanceof Error) {
      kConfigError.value = error.message
      if (error.message === 'Cannot read properties of undefined (reading \'context\')') {
        snackbarStore.setMessage('Le contexte semble vide.', 'error')
        return
      }
      snackbarStore.setMessage(error.message, 'error')
    }
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
      :error="kConfigError || (errorSchema.cluster?.match(/is required$/) || errorSchema.user?.match(/is required$/) ? 'Le kubeconfig semble incomplet.' : '')"
      hint="Uploadez le Kubeconfig du cluster."
      class="fr-mb-2w"
      @change="updateKubeconfig($event)"
    />
    <DsfrSelect
      v-if="isMissingCurrentContext"
      v-model="selectedContext"
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
    <DsfrInputGroup
      v-model="localCluster.cluster.tlsServerName"
      data-testid="tlsServerNameInput"
      label="Nom du serveur Transport Layer Security (TLS)"
      label-visible
      required="required"
      hint="La valeur est extraite du kubeconfig téléversé."
      @update:model-value="updateValues('tlsServerName', $event)"
    />
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
    <DsfrInputGroup
      v-model="localCluster.infos"
      data-testid="infosInput"
      type="text"
      is-textarea
      label="Informations supplémentaires sur le cluster"
      label-visible
      hint="Facultatif. Attention, ces informations seront visibles par les utilisateurs de la console à qui ce cluster est destiné (tous si cluster public, membres des projets concernés pour les clusters réservés)."
      @update:model-value="updateValues('infos', $event)"
    />
    <DsfrCheckbox
      v-model="localCluster.cluster.skipTLSVerify"
      data-testid="clusterSkipTLSVerifyCbx"
      label="Ignorer le certificat TLS du server (risques potentiels de sécurité !)"
      hint="Ignorer le certificat TLS présenté pour contacter l'API server Kubernetes"
      name="isClusterSkipTlsVerify"
      @update:model-value="updateValues('skipTLSVerify', $event)"
    />
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
      required
      select-id="privacy-select"
      label="Confidentialité du cluster"
      :options="['dedicated', 'public']"
    />
    <div
      v-if="localCluster.privacy === 'dedicated'"
      class="fr-mb-2w"
    >
      <MultiSelector
        id="projects-select"
        :options="allProjects.map(project => ({ id: project.id, name: `${project.organization.name} - ${project.name}` }))"
        :array="projectsName"
        :disabled="!allProjects.length"
        no-choice-label="Aucun projet disponible"
        choice-label="Veuillez choisir les projets à associer"
        label="Nom des projets"
        description="Sélectionnez les projets autorisés à utiliser ce cluster."
        @update="updateValues('projectIds', $event)"
      />
    </div>
    <div
      class="fr-mb-2w"
    >
      <MultiSelector
        id="stages-select"
        :options="allStages?.map(stage => ({ id: stage.id, name: `${stage.name}` }))"
        :array="stageNames"
        :disabled="!allStages?.length"
        no-choice-label="Aucun type d'environnement disponible"
        choice-label="Veuillez choisir les types d'environnement à associer"
        label="Nom des types d'environnement"
        description="Sélectionnez les types d'environnement autorisés à utiliser ce cluster."
        @update="updateValues('stageIds', $event)"
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
    <div
      v-if="props.associatedEnvironments.length"
      class="fr-my-6w"
      data-testid="associatedEnvironmentsZone"
    >
      <DsfrAlert
        description="Le cluster ne peut être supprimé, car les environnements ci-dessous y sont déployés."
        small
      />
      <div
        class="flex flex-row flex-wrap gap-4 w-full"
      >
        <DsfrTable
          data-testid="associatedEnvironmentsTable"
          :headers="['Organisation', 'Projet', 'Nom', 'Souscripteur']"
          :rows="getRows(props.associatedEnvironments)"
        />
      </div>
    </div>
    <div
      v-if="localCluster.id && !props.associatedEnvironments.length"
      data-testid="deleteClusterZone"
      class="danger-zone"
    >
      <div class="danger-zone-btns">
        <DsfrButton
          v-show="!isDeletingCluster"
          data-testid="showDeleteClusterBtn"
          :label="`Supprimer le cluster ${localCluster.label}`"
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
          data-testid="deleteClusterInput"
          :label="`Veuillez taper '${localCluster.label}' pour confirmer la suppression du cluster`"
          label-visible
          :placeholder="localCluster.label"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            data-testid="deleteClusterBtn"
            :label="`Supprimer définitivement le cluster ${localCluster.label}`"
            :disabled="clusterToDelete !== localCluster.label"
            :title="`Supprimer définitivement le cluster ${localCluster.label}`"
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
