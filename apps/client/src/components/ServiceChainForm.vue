<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import type {
  ServiceChainDetails,
  ServiceChainFlows,
} from '@cpn-console/shared'
import {
  DsfrBadge,
  DsfrFieldset,
  DsfrInputGroup,
  DsfrStepper,
  DsfrToggleSwitch,
} from '@gouvminint/vue-dsfr'

const props = withDefaults(
  defineProps<{
    serviceChainDetails?: ServiceChainDetails
    serviceChainFlows?: ServiceChainFlows
  }>(),
  {
    serviceChainDetails: () => ({
      id: '',
      state: 'failed',
      commonName: '',
      pai: '',
      network: 'RIE',
      createdAt: new Date(),
      updatedAt: new Date(),
      validationId: '',
      validatedBy: '',
      ref: '',
      location: 'SIR',
      targetAddress: '',
      projectId: '',
      env: 'INT',
      subjectAlternativeName: [],
      redirect: false,
      antivirus: null,
      websocket: false,
      ipWhiteList: [],
      sslOutgoing: false,
    }),

    serviceChainFlows: () => ({
      reserve_ip: {
        state: 'failed',
        input: '',
        output: '',
        updatedAt: new Date(),
      },
      create_cert: {
        state: 'failed',
        input: '',
        output: '',
        updatedAt: new Date(),
      },
      call_exec: {
        state: 'failed',
        input: '',
        output: '',
        updatedAt: new Date(),
      },
      activate_ip: {
        state: 'failed',
        input: '',
        output: '',
        updatedAt: new Date(),
      },
      dns_request: {
        state: 'failed',
        input: '',
        output: '',
        updatedAt: new Date(),
      },
    }),
  },
)

const emit = defineEmits<{
  cancel: []
}>()

const localServiceChainDetails = ref<ServiceChainDetails>(
  props.serviceChainDetails,
)
const localServiceChainFlows = ref<ServiceChainFlows>(props.serviceChainFlows)

const badgeStatus = computed(() => {
  switch (localServiceChainDetails.value.state) {
    case 'success':
      return 'success'
    case 'opened':
      return 'new'
    case 'pending':
      return 'warning'
    default:
      return 'error'
  }
})
const state = computed(() => {
  switch (localServiceChainDetails.value.state) {
    case 'success':
      return 'Succès'
    case 'opened':
      return 'Ouverte'
    case 'pending':
      return 'En cours'
    default:
      return 'Échec'
  }
})
const createdAt = computed(() =>
  localServiceChainDetails.value.createdAt.toISOString().slice(0, 19),
)
const updatedAt = computed(() =>
  localServiceChainDetails.value.updatedAt.toISOString().slice(0, 19),
)
const subjectAlternativeNameList = computed(() =>
  localServiceChainDetails.value.subjectAlternativeName.join(', '),
)
const ipWhiteList = computed(() =>
  localServiceChainDetails.value.ipWhiteList.join(', '),
)
const antivirus = computed(() => !!localServiceChainDetails.value.antivirus)

const flows = [
  'reserve_ip',
  'create_cert',
  'call_exec',
  'activate_ip',
  'dns_request',
] as const
const localizedFlows = [
  'Réservation de l\'IP',
  'Creation du certificat',
  'Appel de l\'exécutable',
  'Activation de l\'IP',
  'Création du DNS',
]
const currentFlow = computed(() =>
  flows.findIndex(
    flow => localServiceChainFlows.value[flow].state !== 'success',
  ),
)

function cancel() {
  emit('cancel')
}

onBeforeMount(() => {
  localServiceChainDetails.value = props.serviceChainDetails
})
</script>

<template>
  <div data-testid="service-chain-form">
    <div class="w-full flex justify-end">
      <DsfrButton
        title="Revenir à la liste des Chaînes de Services"
        data-testid="goBackBtn"
        secondary
        icon-only
        icon="ri:arrow-go-back-line"
        @click="cancel"
      />
    </div>
    <h1 class="fr-h1">
      <span class="mr-5">{{
        `Chaîne de services "${localServiceChainDetails.commonName}"`
      }}</span>
      <DsfrBadge data-testid="state" :type="badgeStatus" :label="state" />
    </h1>

    <DsfrFieldset legend="Informations sur la chaîne de services">
      <div class="grid-wrapper">
        <DsfrInputGroup
          v-model="localServiceChainDetails.env"
          data-testid="env"
          :disabled="false"
          label="Environnement"
          label-visible
          class="w-full mb-5"
          hint="INT ou PROD"
        />

        <DsfrInputGroup
          v-model="localServiceChainDetails.pai"
          data-testid="pai"
          :disabled="false"
          label="Nom du projet (PAI)"
          label-visible
          class="w-full"
          wrapper-class="mr-5"
          hint="Le PAI (nom de projet) défini lors de la création de la chaîne de services"
        />

        <DsfrInputGroup
          v-model="localServiceChainDetails.network"
          data-testid="network"
          :disabled="false"
          label="Réseau"
          label-visible
          class="w-full"
          hint="Le réseau sur lequel s'applique la chaîne de services"
        />

        <DsfrInputGroup
          v-model="createdAt"
          type="datetime-local"
          data-testid="createdAt"
          :disabled="false"
          label="Créé le"
          label-visible
          class="w-full"
          wrapper-class="mr-5"
          hint="La date à laquelle la chaîne de services a été créée"
        />

        <DsfrInputGroup
          v-model="updatedAt"
          type="datetime-local"
          data-testid="updatedAt"
          :disabled="false"
          label="Mise à jour le"
          label-visible
          class="w-full"
          hint="La dernière date à laquelle la chaîne de services a été mise à jour"
        />

        <DsfrInputGroup
          v-model="localServiceChainDetails.validationId"
          data-testid="validationId"
          :disabled="false"
          label="ID de validation"
          label-visible
          class="w-full mb-5"
          hint="L'UUID qui a été utilisé pour valider la demande de chaîne de services"
        />

        <DsfrInputGroup
          v-model="localServiceChainDetails.validatedBy"
          data-testid="validatedBy"
          :disabled="false"
          label="Validé par"
          label-visible
          class="w-full mb-5"
          hint="L'UUID de la personne qui a validé la demande de chaîne de services"
        />

        <DsfrInputGroup
          v-model="localServiceChainDetails.ref"
          data-testid="ref"
          :disabled="false"
          label="Chaîne de services référente"
          label-visible
          class="w-full mb-5"
          hint="Certaines chaînes de services sont mutualisées entre elles. Ce champ contient l'UUID de la CdS référente"
        />

        <DsfrInputGroup
          v-model="localServiceChainDetails.location"
          data-testid="location"
          :disabled="false"
          label="Emplacement du datacenter"
          label-visible
          class="w-full mb-5"
          hint="SIL, SIR, etc."
        />
        <DsfrInputGroup
          v-model="localServiceChainDetails.targetAddress"
          data-testid="targetAddress"
          :disabled="false"
          label="Adresse IP cible"
          label-visible
          class="w-full mb-5"
        />

        <DsfrInputGroup
          v-model="localServiceChainDetails.projectId"
          data-testid="projectId"
          :disabled="false"
          label="Projet lié"
          label-visible
          class="w-full mb-5"
          hint="L'UUID du projet lié à cette chaîne de services"
        />

        <DsfrInputGroup
          v-model="subjectAlternativeNameList"
          data-testid="subjectAlternativeName"
          :disabled="false"
          type="text"
          is-textarea
          label="Subject Alternative Names (SANs)"
          label-visible
          class="w-full mb-5"
          hint="Les SANs du certificat"
        />

        <DsfrToggleSwitch
          v-model="localServiceChainDetails.redirect"
          name="redirect"
          data-testid="redirect"
          label="Redirection"
          label-visible
          class="mb-5"
          hint="Indique si une redirection du traffic doit-être effectuée"
        />

        <DsfrToggleSwitch
          v-model="localServiceChainDetails.websocket"
          name="websocket"
          data-testid="websocket"
          label="Support de WebSocket"
          label-visible
          class="mb-5"
          hint="Indique si le support de WebSocket doit être activé"
        />

        <DsfrToggleSwitch
          v-model="localServiceChainDetails.sslOutgoing"
          name="sslOutgoing"
          data-testid="sslOutgoing"
          label="SSL Sortant"
          label-visible
          class="mb-5"
          hint="Indique si SSL doit être mis en place sur le traffic sortant"
        />

        <DsfrInputGroup
          v-model="ipWhiteList"
          data-testid="ipWhiteList"
          :disabled="false"
          type="text"
          is-textarea
          label="Adresses IP autorisées pour la chaîne de services"
          label-visible
          class="w-full mb-5"
          hint="Uniquement des blocs CIDRs"
        />

        <DsfrToggleSwitch
          v-model="antivirus"
          name="antivirus"
          data-testid="antivirus"
          label="Antivirus"
          class="w-max mb-5"
          hint="Indique si l'antivirus est activé pour la chaîne de services"
        />

        <DsfrInputGroup
          v-if="localServiceChainDetails.antivirus"
          v-model="localServiceChainDetails.antivirus.maxFileSize"
          data-testid="antivirus-maxFileSize"
          :disabled="false"
          label="Taille de fichier maximal pour l'antivirus"
          label-visible
          class="w-max mb-5"
          hint="L'antivirus ignorera les fichiers dont la taille dépasse celle spécifiée ici"
        />
      </div>
    </DsfrFieldset>

    <DsfrFieldset
      legend="Étapes de création de la chaîne de services"
      data-testid="service-chain-flows"
    >
      <DsfrStepper
        :steps="localizedFlows"
        :current-step="currentFlow"
        class="w-full mb-5"
        hint="Lorem ipsum"
      />
    </DsfrFieldset>
  </div>
</template>

<style scoped>
.flex-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
}

.flex-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.grid-wrapper {
  display: grid;
  grid-template-columns: auto auto auto;
  grid-template-rows: 80px auto 80px;
  gap: 4rem 2rem;
}
</style>
