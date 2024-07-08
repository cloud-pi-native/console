<script lang="ts" setup>
import { ref, computed, onBeforeMount, watch } from 'vue'
import {
  ClusterPrivacy,
  ClusterDetailsSchema,
  KubeconfigSchema,
  SharedZodError,
  type ClusterAssociatedEnvironments,
  type ClusterDetails,
  type ProjectV2,
  type Stage,
  type Zone,
} from '@cpn-console/shared'
// @ts-ignore
import { load } from 'js-yaml'
// @ts-ignore
import { JsonViewer } from 'vue3-json-viewer'
import { useSnackbarStore } from '@/stores/snackbar.js'
import ChoiceSelector from './ChoiceSelector.vue'
import { toCodeComponent } from '@/utils/func.js'

const snackbarStore = useSnackbarStore()

const props = withDefaults(defineProps<{
  isNewCluster: boolean
  cluster: ClusterDetails
  allProjects: ProjectV2[]
  allStages: Stage[]
  allZones: Zone[]
  associatedEnvironments: ClusterAssociatedEnvironments
}>(), {
  isNewCluster: true,
  cluster: () => ({
    label: '',
    stageIds: [],
    clusterResources: false,
    privacy: ClusterPrivacy.DEDICATED,
    infos: '',
    id: '',
    kubeconfig: {
      cluster: {
        tlsServerName: '',
      },
      user: {},
    },
    zoneId: '',
    projectIds: [],
  }),
  allZones: () => [],
  allProjects: () => [],
  allStages: () => [],
  associatedEnvironments: () => [],
})

const jsonKConfig = ref<Record<any, any>>({})
const kConfigError = ref<string | undefined>(undefined)
const isMissingCurrentContext = ref<boolean>(false)
const contexts = ref([])
const selectedContext = ref('')
const localCluster = ref<ClusterDetails>(props.cluster)
const kubeconfig = ref()
const clusterToDelete = ref('')
const isDeletingCluster = ref(false)

if (!localCluster.value.zoneId && props.allZones.length) {
  localCluster.value.zoneId = props.allZones[0].id
}

const errorSchema = computed<SharedZodError | undefined>(() => {
  let schemaValidation
  if (localCluster.value.id) {
    schemaValidation = ClusterDetailsSchema.safeParse(localCluster.value)
  } else {
    schemaValidation = ClusterDetailsSchema.omit({ id: true }).partial().safeParse(localCluster.value)
  }
  return schemaValidation.success ? undefined : schemaValidation.error
})
const isClusterValid = computed(() => !errorSchema.value)
const chosenZoneDescription = computed(() => props.allZones.find(zone => zone.id === localCluster.value.zoneId)?.description)

const updateKubeconfig = (files: FileList) => {
  kConfigError.value = undefined
  localCluster.value.kubeconfig.cluster = {
    tlsServerName: '',
  }
  localCluster.value.kubeconfig.user = {}

  try {
    const reader = new FileReader()
    reader.onload = (evt) => {
      // Retrieve YAML kubeconfig, turn it to JSON object.
      if (evt.target) jsonKConfig.value = load(evt.target.result, 'utf8')
      // Retrieve context.
      let context
      if (!jsonKConfig.value.contexts) throw new Error('Pas de contexts spécifiés dans le kubeconfig.')
      if (jsonKConfig.value['current-context']) {
        context = jsonKConfig.value.contexts.find((ctx: Record<string, any>) => ctx.name === jsonKConfig.value['current-context']).context
        isMissingCurrentContext.value = false
        retrieveUserAndCluster(context)
      } else {
        contexts.value = jsonKConfig.value.contexts.map((context: Record<string, any>) => context.name)
        isMissingCurrentContext.value = true
        snackbarStore.setMessage('Pas de current-context. Choisissez un contexte.')
      }
    }
    reader.readAsText(files[0])
  } catch (error) {
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
    const {
      username,
      password,
      token,
      'client-certificate-data': certData,
      'client-key-data': keyData,
    } = jsonKConfig.value.users.find((user: Record<string, any>) => user.name === context.user).user
    localCluster.value.kubeconfig.user = {
      ...username && password && { username, password },
      ...token && { token },
      ...certData && keyData && { certData, keyData },
    }
    const {
      server,
      'certificate-authority-data': caData,
      'insecure-skip-tls-verify': skipTLSVerify,
    } = jsonKConfig.value.clusters.find((cluster: Record<string, any>) => cluster.name === context.cluster).cluster
    localCluster.value.kubeconfig.cluster = {
      server,
      tlsServerName: server.split('https://')[1].split(':')[0],
      ...caData && { caData },
      skipTLSVerify: skipTLSVerify || false,
    }
  } catch (error) {
    // @ts-ignore
    kConfigError.value = error?.message
  }
}

const getRows = (associatedEnvironments: ClusterAssociatedEnvironments) => {
  return associatedEnvironments
    ?.map(associatedEnvironment => ([
      toCodeComponent(associatedEnvironment.organization),
      toCodeComponent(associatedEnvironment.project),
      toCodeComponent(associatedEnvironment.name),
      toCodeComponent(associatedEnvironment.owner ?? ''),
    ]))
}

const emit = defineEmits<{
  add: [value: Omit<ClusterDetails, 'id'>]
  update: [value: Partial<ClusterDetails>]
  delete: [value: typeof localCluster.value['id']]
  cancel: []
}>()

const addCluster = () => {
  if (isClusterValid.value) emit('add', localCluster.value)
}

const updateCluster = () => {
  if (isClusterValid.value) emit('update', localCluster.value)
}

const cancel = () => {
  emit('cancel')
}

onBeforeMount(() => {
  localCluster.value = props.cluster
})

watch(selectedContext, () => {
  try {
    const context = jsonKConfig.value.contexts.find((ctx: Record<string, any>) => ctx.name === jsonKConfig.value[selectedContext.value]).context
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
const isConnectionDetailsShown = ref(true)

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
    <div
      class="cursor-pointer"
      @click="isConnectionDetailsShown = !isConnectionDetailsShown"
    >
      <h4
        class="mb-1 inline-block"
        :aria-expanded="isConnectionDetailsShown"
      >
        Informations de connexion (kubeconfig)
      </h4>
      <v-icon
        v-if="isConnectionDetailsShown"
        name="ri-arrow-right-s-line"
        class="shrink ml-4 rotate-90"
      />
      <v-icon
        v-else
        name="ri-arrow-right-s-line"
        class="shrink ml-4"
      />
    </div>
    <template
      v-if="isConnectionDetailsShown"
    >
      <DsfrFileUpload
        v-model="kubeconfig"
        label=""
        data-testid="kubeconfig-upload"
        :error="kConfigError"
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
        data-testid="user-json"
        :value="localCluster.kubeconfig.user"
        class="json-box"
        copyable
        boxed
      />
      <JsonViewer
        data-testid="cluster-json"
        :value="localCluster.kubeconfig.cluster"
        class="json-box"
        copyable
        boxed
      />
      <DsfrInputGroup
        v-model="localCluster.kubeconfig.cluster.tlsServerName"
        data-testid="tlsServerNameInput"
        label="Nom du serveur Transport Layer Security (TLS)"
        label-visible
        :required="true"
        :error-message="localCluster.kubeconfig.cluster.tlsServerName && !KubeconfigSchema.pick({ cluster: true }).safeParse({ cluster: { tlsServerName: localCluster.kubeconfig.cluster.tlsServerName } }).success ? 'Le nom du serveur TLS est obligatoire': undefined"
        hint="La valeur est extraite du kubeconfig téléversé."
      />
      <DsfrCheckbox
        id="clusterSkipTLSVerifyCbx"
        v-model="localCluster.kubeconfig.cluster.skipTLSVerify"
        label="Ignorer le certificat TLS du server (risques potentiels de sécurité !)"
        hint="Ignorer le certificat TLS présenté pour contacter l'API server Kubernetes"
        name="isClusterSkipTlsVerify"
      />
    </template>
    <h4
      class="mb-1 inline-block"
    >
      Informations fonctionnelles
    </h4>
    <DsfrInputGroup
      v-model="localCluster.label"
      data-testid="labelInput"
      type="text"
      :disabled="!isNewCluster"
      :required="true"
      :error-message="localCluster.label && !ClusterDetailsSchema.pick({label: true}).safeParse({label: localCluster.label}).success ? 'Le nom du cluster ne doit contenir ni espaces ni caractères spéciaux': undefined"
      label="Nom du cluster applicatif"
      label-visible
      hint="Nom du cluster applicatif utilisable lors des déploiements Argocd."
      placeholder="erpc-ovh"
    />
    <DsfrInputGroup
      v-model="localCluster.infos"
      data-testid="infosInput"
      type="text"
      is-textarea
      label="Informations supplémentaires sur le cluster"
      label-visible
      hint="Facultatif. Attention, ces informations seront visibles par les utilisateurs de la console à qui ce cluster est destiné (tous si cluster public, membres des projets concernés pour les clusters réservés)."
    />
    <DsfrCheckbox
      id="clusterResourcesCbx"
      v-model="localCluster.clusterResources"
      label="Ressources cluster"
      hint="Cochez la case si des ressources de type cluster peuvent être déployées par Argocd."
      name="isClusterResources"
    />
    <DsfrSelect
      v-model="localCluster.zoneId"
      required
      select-id="zone-select"
      label="Zone associée"
      hint="Sélectionnez la zone associée à ce cluster."
      :options="props.allZones?.map(zone => ({ value: zone.id, text: zone.label }))"
    />
    <DsfrAlert
      v-if="chosenZoneDescription"
      data-testid="chosenZoneDescription"
      class="my-4"
      :description="chosenZoneDescription"
      small
    />
    <DsfrSelect
      v-model="localCluster.privacy"
      required
      select-id="privacy-select"
      label="Confidentialité du cluster"
      :options="Object.values(ClusterPrivacy)"
    />
    <div
      v-if="localCluster.privacy === ClusterPrivacy.DEDICATED"
      class="fr-mb-2w"
    >
      <ChoiceSelector
        id="projects-select"
        wrapped
        label="Projets associés"
        description="Sélectionnez les projets autorisés à utiliser ce cluster."
        :options="props.allProjects.map(project => ({ id: project.id, label: `${project.organization?.name} - ${project.name}`}))"
        :options-selected="props.allProjects
          .filter(project => localCluster.projectIds?.includes(project.id))
          .map(project => ({id: project.id, label: `${project.organization?.name} - ${project.name}` }))"
        label-key="label"
        value-key="id"
        :disabled="false"
        @update="(_p, projectIds) => localCluster.projectIds = projectIds"
      />
    </div>
    <div
      class="fr-mb-2w"
    >
      <ChoiceSelector
        id="stages-select"
        :wrapped="false"
        label="Nom des types d'environnement"
        description="Sélectionnez les types d'environnement autorisés à utiliser ce cluster."
        :options="props.allStages"
        :options-selected="props.allStages.filter(stage => props.cluster.stageIds.includes(stage.id))"
        label-key="name"
        value-key="id"
        :disabled="false"
        @update="(_s, stageIds) => localCluster.stageIds = stageIds"
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
        label="Enregistrer"
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
          title="Environnements déployés sur le cluster"
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
