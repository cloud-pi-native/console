<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import type { ServiceChainDetails } from '@cpn-console/shared'
import {
  DsfrBadge,
  DsfrFieldset,
  DsfrInputGroup,
  DsfrToggleSwitch,
} from '@gouvminint/vue-dsfr'

const props = withDefaults(
  defineProps<{
    serviceChainDetails?: ServiceChainDetails
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
  },
)

const emit = defineEmits<{
  cancel: []
}>()

const localServiceChain = ref<ServiceChainDetails>(props.serviceChainDetails)

const badgeStatus = computed(() => {
  switch (localServiceChain.value.state) {
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
  switch (localServiceChain.value.state) {
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
  localServiceChain.value.createdAt.toISOString().slice(0, 19),
)
const updatedAt = computed(() =>
  localServiceChain.value.updatedAt.toISOString().slice(0, 19),
)
const subjectAlternativeNameList = computed(() =>
  localServiceChain.value.subjectAlternativeName.join(', '),
)
const ipWhiteList = computed(() =>
  localServiceChain.value.ipWhiteList.join(', '),
)
const antivirus = computed(() => !!localServiceChain.value.antivirus)

function cancel() {
  emit('cancel')
}

onBeforeMount(() => {
  localServiceChain.value = props.serviceChainDetails
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
      {{ `Chaîne de services "${localServiceChain.commonName}"` }}
    </h1>

    <DsfrFieldset legend="Informations sur la chaîne de services">
      <div class="grid-wrapper">
        <DsfrInputGroup
          v-model="localServiceChain.env"
          data-testid="env"
          :disabled="false"
          label="Environnement"
          label-visible
          class="w-full mb-5"
          hint="INT ou PROD"
        />

        <DsfrBadge
          data-testid="state"
          :type="badgeStatus"
          :label="`État de la CdS: ${state}`"
        />

        <DsfrInputGroup
          v-model="localServiceChain.pai"
          data-testid="pai"
          :disabled="false"
          label="Plan d'Adressage Interne (PAI)"
          label-visible
          class="w-full"
          wrapper-class="mr-5"
          hint="Le PAI défini lors de la création de la chaîne de services"
        />

        <DsfrInputGroup
          v-model="localServiceChain.network"
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
          v-model="localServiceChain.validationId"
          data-testid="validationId"
          :disabled="false"
          label="ID de validation"
          label-visible
          class="w-full mb-5"
          hint="L'UUID qui a été utilisé pour valider la demande de chaîne de services"
        />

        <DsfrInputGroup
          v-model="localServiceChain.validatedBy"
          data-testid="validatedBy"
          :disabled="false"
          label="UUID qui a validé"
          label-visible
          class="w-full mb-5"
          hint="L'UUID qui a validé la demande de chaîne de services"
        />

        <DsfrInputGroup
          v-model="localServiceChain.ref"
          data-testid="ref"
          :disabled="false"
          label="Chaîne de services référente"
          label-visible
          class="w-full mb-5"
          hint="Certaines chaînes de services sont mutualisées entre elles. Ce champ contient l'UUID de la CdS référente"
        />

        <DsfrInputGroup
          v-model="localServiceChain.location"
          data-testid="location"
          :disabled="false"
          label="Emplacement"
          label-visible
          class="w-full mb-5"
          hint="SIL ou SIR"
        />
        <DsfrInputGroup
          v-model="localServiceChain.targetAddress"
          data-testid="targetAddress"
          :disabled="false"
          label="Adresse IP cible"
          label-visible
          class="w-full mb-5"
        />

        <DsfrInputGroup
          v-model="localServiceChain.projectId"
          data-testid="projectId"
          :disabled="false"
          label="Projet lié"
          label-visible
          class="w-full mb-5"
          hint="L'UUID du projet lié à cette chaîne de services"
        />

        <DsfrToggleSwitch
          v-model="localServiceChain.redirect"
          name="redirect"
          data-testid="redirect"
          label="Redirection"
          label-visible
          class="mb-5"
          hint="Indique si une redirection du traffic doit-être effectuée"
        />

        <DsfrToggleSwitch
          v-model="localServiceChain.websocket"
          name="websocket"
          data-testid="websocket"
          label="Support de WebSocket"
          label-visible
          class="mb-5"
          hint="Indique si le support de WebSocket doit être activé"
        />

        <DsfrToggleSwitch
          v-model="localServiceChain.sslOutgoing"
          name="sslOutgoing"
          data-testid="sslOutgoing"
          label="SSL Sortant"
          label-visible
          class="mb-5"
          hint="Indique si SSL doit être mis en place sur le traffic sortant"
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

        <DsfrInputGroup
          v-model="ipWhiteList"
          data-testid="ipWhiteList"
          :disabled="false"
          type="text"
          is-textarea
          label="Adresses IP Whitelistées"
          label-visible
          class="w-full mb-5"
          hint="Les blocks d'adresses CIDR autorisés pour la chaîne de services"
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
          v-if="localServiceChain.antivirus"
          v-model="localServiceChain.antivirus.maxFileSize"
          data-testid="antivirus-maxFileSize"
          :disabled="false"
          label="Taille de fichier maximal pour l'antivirus"
          label-visible
          class="w-max mb-5"
          hint="L'antivirus ignorera les fichiers dont la taille dépasse celle spécifiée ici"
        />
      </div>
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
