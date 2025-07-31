<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import type {
  ServiceChain,
} from '@cpn-console/shared'
import router from '@/router/index.js'
import { useServiceChainStore } from '@/stores/service-chain.js'
import { getRandomId } from '@/utils/func.js'

const serviceChainStore = useServiceChainStore()

const tableKey = ref(getRandomId('table'))
const isLoading = ref(true)
const inputSearchText = ref('')

const serviceChainsFiltered = computed(() => serviceChainStore.serviceChains.filter(serviceChain => serviceChain.commonName.includes(inputSearchText.value)))
const title = 'Liste des Chaînes de Service'

onMounted(async () => {
  await Promise.all([
    serviceChainStore.getServiceChains(),
  ])
  isLoading.value = false
})

function clickServiceChain(serviceChain: ServiceChain) {
  router.push({ name: 'AdminServiceChain', params: { id: serviceChain.id } })
}
</script>

<template>
  <div
    class="flex justify-between gap-5 w-full items-end mb-5"
  >
    <div
      class="flex gap-5 w-max items-end"
    >
      <DsfrInputGroup
        v-model="inputSearchText"
        data-testid="projectsSearchInput"
        common-name-visible
        placeholder="Recherche textuelle"
        common-name="Recherche"
        class="mb-0"
      />
    </div>
  </div>
  <DsfrTable
    :key="tableKey"
    data-testid="tableAdministrationServiceChains"
    :title="title"
  >
    <template #header>
      <tr>
        <td>Nom commun</td>
        <td>PAI</td>
        <td>État</td>
      </tr>
    </template>
    <tr
      v-if="isLoading || !serviceChainsFiltered.length"
    >
      <td colspan="7">
        {{ isLoading ? 'Chargement...' : 'Aucune chaîne de service trouvée' }}
      </td>
    </tr>
    <tr
      v-for="serviceChain in serviceChainsFiltered"
      v-else
      :key="serviceChain.id"
      :data-testid="`serviceChainTr-${serviceChain.commonName}`"
      class="cursor-pointer relative"
      :title="`Voir le tableau de bord du projet ${serviceChain.commonName}`"
      @click.stop="() => clickServiceChain(serviceChain)"
    >
      <td>{{ serviceChain.commonName }}</td>
      <td>{{ serviceChain.pai }}</td>
      <td>{{ serviceChain.state }}</td>
    </tr>
  </DsfrTable>
</template>

<style scoped>
.fr-select-group, .fr-input-group {
  margin-bottom: 0 !important;
}
</style>
