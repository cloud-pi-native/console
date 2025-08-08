<script setup lang="ts">
import router from '@/router/index.js'
import { useServiceChainStore } from '@/stores/service-chain.js'
import type {
  ServiceChain,
  ServiceChainDetails,
  ServiceChainFlows,
} from '@cpn-console/shared'

const props = defineProps<{
  id: ServiceChain['id']
}>()

const isLoading = ref(true)
const serviceChainStore = useServiceChainStore()
const serviceChainDetails = ref<ServiceChainDetails>()
const serviceChainFlows = ref<ServiceChainFlows>()

onMounted(async () => {
  serviceChainDetails.value = await serviceChainStore.getServiceChainDetails(
    props.id,
  )
  serviceChainFlows.value = await serviceChainStore.getServiceChainFlows(
    props.id,
  )
  isLoading.value = false
})

function goBack() {
  router.push({ name: 'ListServiceChains' })
}
</script>

<template>
  <template v-if="!isLoading">
    <ServiceChainForm
      :service-chain-details="serviceChainDetails"
      :service-chain-flows="serviceChainFlows"
      @cancel="goBack"
    />
  </template>
</template>
