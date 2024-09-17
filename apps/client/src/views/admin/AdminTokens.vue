<script lang="ts" setup>
import { onMounted } from 'vue'
import type { AdminToken } from '@cpn-console/shared'
import { getAdminPermLabelsByValue } from '@cpn-console/shared'
import { useAdminTokenStore } from '@/stores/admin-token.js'

const statusWording: Record<AdminToken['status'], string> = {
  active: 'Actif',
  revoked: 'Révoqué',
}
const headers = [
  'Nom',
  'Permissions',
  'Créateur',
  'Date de création',
  'Date d\'expiration',
  'Dernière utilisation',
  'État',
  'Révoquer',
]
const adminTokenStore = useAdminTokenStore()

const tokens = ref<AdminToken[]>([])
const displayRevoked = ref(false)

async function deleteToken(id: AdminToken['id']) {
  await adminTokenStore.deleteToken(id)
  await getAllTokens()
}

const rows = computed(() => tokens.value.length
  ? tokens.value.map(token => ([
    token.name,
    getAdminPermLabelsByValue(token.permissions).join(', '),
    token.createdBy?.email ?? '-',
    (new Date(token.createdAt)).toLocaleString(),
    token.expirationDate ? (new Date(token.expirationDate)).toLocaleString() : 'Jamais',
    token.lastUse ? (new Date(token.lastUse)).toLocaleString() : 'Jamais',
    statusWording[token.status],
    {
      cellAttrs: {
        class: `fr-fi-close-line justify-center ${token.status === 'active' ? 'cursor-pointer fr-text-default--warning' : 'cursor-not-allowed'}`,
        title: 'Supprimer',
        onClick: () => deleteToken(token.id),
      },
    },
  ]))
  : [[{
      field: 'string',
      text: 'Aucune clé d\'api existante',
      cellAttrs: {
        colspan: headers.length,
      },
    }]],
)

async function getAllTokens() {
  tokens.value = await adminTokenStore.listTokens({ withRevoked: displayRevoked.value })
}

function switchDisplayRevoked() {
  displayRevoked.value = !displayRevoked.value
  getAllTokens()
}

onMounted(async () => {
  await getAllTokens()
})
</script>

<template>
  <h3>
    Jetons d'API
  </h3>
  <div
    class="w-full"
  >
    <AdminTokenForm
      @create="getAllTokens"
    />
  </div>
  <div>
    <DsfrTable
      data-testid="adminTokenTable"
      :headers="headers"
      :rows="rows"
    />
  </div>
  <DsfrButton
    :label="displayRevoked ? 'Masquer les jetons révoqués' : 'Voir les jetons révoqués'"
    class="mt-5"
    secondary
    @click="switchDisplayRevoked"
  />
</template>
