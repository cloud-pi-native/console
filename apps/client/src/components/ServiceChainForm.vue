<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import type { ServiceChainDetails } from '@cpn-console/shared'
import { ServiceChainDetailsSchema } from '@cpn-console/shared'

const props = withDefaults(
  defineProps<{
    serviceChain?: ServiceChainDetails
  }>(),
  {
    serviceChain: () => ({
      id: '',
      state: '',
      success: false,
      validation_id: '',
      validated_by: '',
      version: '',
      pai: '',
      ref: '',
      location: '',
      targetAddress: '',
      PAI: '',
      projectId: '',
      env: '',
      network: '',
      commonName: '',
      subjectAlternativeName: [],
      redirect: false,
      antivirus: false,
      maxFileSize: Number.NaN,
      websocket: false,
      ipWhiteList: [],
      sslOutgoing: false,
      createat: '',
      updateat: '',
    }),
  },
)

const emit = defineEmits<{
  cancel: []
}>()

const localServiceChain = ref<ServiceChainDetails>(props.serviceChain)

function cancel() {
  emit('cancel')
}

onBeforeMount(() => {
  localServiceChain.value = props.serviceChain
})
</script>

<template>
  <div data-testid="service-chain-form">
    <div class="w-full flex justify-end">
      <DsfrButton
        title="Revenir à la liste des Chaînes de Service"
        data-testid="goBackBtn"
        secondary
        icon-only
        icon="ri:arrow-go-back-line"
        @click="cancel"
      />
    </div>
    <h1 class="fr-h1">
      {{ `Chaîne de Services "${localServiceChain.commonName}"` }}
    </h1>
    <h4 class="mb-1 inline-block">
      Informations fonctionnelles
    </h4>
    <DsfrInputGroup
      v-model="localServiceChain.commonName"
      data-testid="labelInput"
      type="text"
      :disabled="true"
      :required="true"
      :error-message="
        localServiceChain.commonName
          && !ServiceChainDetailsSchema.pick({ commonName: true }).safeParse({
            commonName: localServiceChain.commonName,
          }).success
          ? 'Le nom de la chaîne de services ne doit contenir ni espaces ni caractères spéciaux'
          : undefined
      "
      label="Nom de la chaîne de services"
      label-visible
      hint="Le nom utilisé est le Common Name"
      placeholder="dso.dso.minint.fr"
    />
  </div>
</template>
