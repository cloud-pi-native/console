<script setup lang="ts">
import router from '@/router/index.js'
import { useServiceChainStore } from '@/stores/service-chain.js'
import type { ServiceChain, ServiceChainDetails } from '@cpn-console/shared'

const props = defineProps<{
  id: ServiceChain['id'] | 'create'
}>()

const isLoading = ref(true)
const serviceChainStore = useServiceChainStore()
const serviceChain = ref<ServiceChainDetails>()

onMounted(async () => {
  if (props.id !== 'create') {
    serviceChain.value = await serviceChainStore.getServiceChainDetails(
      props.id,
    )
  }
  isLoading.value = false
})

function goBack() {
  router.push({ name: 'ListServiceChains' })
}
</script>

<template>
  <template v-if="!isLoading">
    <ServiceChainForm :service-chain="serviceChain" @cancel="goBack" />
  </template>
</template>
