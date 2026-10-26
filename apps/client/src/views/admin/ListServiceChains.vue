<script lang="ts" setup>
import type { ServiceChain } from '@cpn-console/shared'
import { onMounted, ref } from 'vue'
import router from '@/router/index.js'
import { useServiceChainStore } from '@/stores/service-chain.js'
import { getRandomId } from '@/utils/func.js'
import { collectionViewState } from '@/utils/list-state.js'

const serviceChainStore = useServiceChainStore()

const tableKey = ref(getRandomId('table'))
const isLoading = ref(true)
const loadError = ref<Error>()
const inputSearchText = ref('')

const serviceChainsFiltered = computed(() =>
  serviceChainStore.serviceChains
    .filter(serviceChain =>
      serviceChain.commonName.includes(inputSearchText.value),
    )
    .map((serviceChain) => {
      let badgeState: 'success' | 'new' | 'warning' | 'error'
      let localizedState
      switch (serviceChain.state) {
        case 'success':
          badgeState = 'success'
          localizedState = 'Succès'
          break
        case 'opened':
          badgeState = 'new'
          localizedState = 'Nouveau'
          break
        case 'pending':
          badgeState = 'warning'
          localizedState = 'En Attente'
          break
        default:
          badgeState = 'error'
          localizedState = 'En erreur'
      }

      return {
        ...serviceChain,
        badgeState,
        localizedState,
      }
    }),
)
const title = 'Liste des Chaînes de Services'

const viewState = computed(() => collectionViewState({
  loading: isLoading.value,
  error: loadError.value,
  count: serviceChainsFiltered.value.length,
}))

async function getServiceChainsList() {
  isLoading.value = true
  loadError.value = undefined
  try {
    await serviceChainStore.getServiceChainsList()
  } catch (error) {
    loadError.value = error instanceof Error ? error : new Error('Erreur inattendue')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  getServiceChainsList()
})

function clickServiceChain(id: ServiceChain['id']) {
  router.push({ name: 'AdminServiceChain', params: { id } })
}
</script>

<template>
  <div class="flex justify-between gap-5 w-max items-end mb-5">
    <div class="flex gap-5 w-max items-end">
      <DsfrInputGroup
        v-model="inputSearchText"
        data-testid="projectsSearchInput"
        common-name-visible
        placeholder="Recherche textuelle (Common Name)"
        common-name="Recherche"
        class="mb-0"
        style="field-sizing: content"
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
        <td>CN (Common Name)</td>
        <td>PAI</td>
        <td>Réseau</td>
        <td>État</td>
        <td>Créé le</td>
        <td>Mis à jour le</td>
      </tr>
    </template>
    <tr v-if="viewState === 'loading'">
      <td colspan="7">
        <Loader />
      </td>
    </tr>
    <tr
      v-else-if="viewState === 'error' && loadError"
      data-testid="serviceChainsLoadError"
    >
      <td colspan="7">
        <DsfrAlert
          type="error"
          title="Impossible de charger les chaînes de services"
          :description="`${loadError.message} Réessayez dans quelques instants.`"
        />
        <DsfrButton
          class="fr-mt-2w"
          label="Réessayer"
          data-testid="listRetry"
          secondary
          icon="ri:refresh-line"
          @click="getServiceChainsList"
        />
      </td>
    </tr>
    <tr
      v-else-if="!serviceChainsFiltered.length"
      data-testid="serviceChainsEmptyState"
    >
      <td colspan="7">
        Aucune chaîne de service trouvée
      </td>
    </tr>
    <tr
      v-for="serviceChain in serviceChainsFiltered"
      v-else
      :key="serviceChain.id"
      :data-testid="`serviceChainTr-${serviceChain.commonName}`"
      class="cursor-pointer relative"
      :title="`Voir les détails de la chaîne de service ${serviceChain.commonName}`"
      @click.stop="() => clickServiceChain(serviceChain.id)"
    >
      <td>{{ serviceChain.commonName }}</td>
      <td>{{ serviceChain.pai }}</td>
      <td>{{ serviceChain.network }}</td>
      <td>
        <DsfrBadge
          data-testid="state"
          :type="serviceChain.badgeState"
          :label="serviceChain.localizedState"
        />
      </td>
      <td>{{ new Date(serviceChain.createdAt).toLocaleString() }}</td>
      <td>{{ new Date(serviceChain.updatedAt).toLocaleString() }}</td>
    </tr>
  </DsfrTable>
</template>

<style scoped>
.fr-select-group,
.fr-input-group {
  margin-bottom: 0 !important;
}
</style>
