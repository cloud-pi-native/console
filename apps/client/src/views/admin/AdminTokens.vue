<script lang="ts" setup>
import { onMounted } from 'vue'
import type { AdminToken } from '@cpn-console/shared'
import { getAdminPermLabelsByValue } from '@cpn-console/shared'
import { useAdminTokenStore } from '@/stores/admin-token'
import type { SimpleToken } from '@/components/TokenForm.vue'
import { clickInDialog } from '@/utils/func'

const statusWording: Record<AdminToken['status'], string> = {
  active: 'Actif',
  revoked: 'Révoqué',
  inactive: 'Inactif',
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
const displayNewTokenForm = ref(false)
const deleteTokenId = ref('')
const deleteModalOpened = ref(false)

async function deleteToken() {
  await adminTokenStore.deleteToken(deleteTokenId.value)
  deleteTokenId.value = ''
  deleteModalOpened.value = false
  await getAllTokens()
}

const rows = computed(() => tokens.value.length
  ? tokens.value.map(token => ([
      token.name,
      getAdminPermLabelsByValue(token.permissions).join(', '),
      token.owner?.email ?? '-',
      (new Date(token.createdAt)).toLocaleString(),
      token.expirationDate ? (new Date(token.expirationDate)).toLocaleString() : 'Jamais',
      token.lastUse ? (new Date(token.lastUse)).toLocaleString() : 'Jamais',
      statusWording[token.status],
      {
        cellAttrs: {
          class: `fr-fi-close-line justify-center ${token.status === 'active' ? 'cursor-pointer fr-text-default--warning' : 'cursor-not-allowed'}`,
          title: 'Supprimer',
          onClick: () => { deleteModalOpened.value = true; deleteTokenId.value = token.id },
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

const formProps = ref<{ exposedToken?: string }>({ exposedToken: undefined })
async function createToken(token: SimpleToken) {
  const exposedToken = await adminTokenStore.createToken({
    permissions: '2',
    ...token,
  })
  formProps.value.exposedToken = exposedToken.password
  getAllTokens()
}

async function resetForm() {
  formProps.value.exposedToken = undefined
}

function switchDisplayRevoked() {
  displayRevoked.value = !displayRevoked.value
  getAllTokens()
}

onMounted(async () => {
  await getAllTokens()
})

function closeModal() {
  deleteModalOpened.value = false
}
</script>

<template>
  <h3>
    Jetons d'API
  </h3>
  <div
    class="w-full"
  >
    <DsfrButton
      v-if="!displayNewTokenForm"
      label="Créer un nouveau jeton"
      data-testid="showNewTokenFormBtn"
      secondary
      @click="displayNewTokenForm = true"
    />
    <TokenForm
      v-else
      :mandatory-expiration="false"
      :exposed-token="formProps.exposedToken"
      @create="(token: SimpleToken) => createToken(token)"
      @reset="resetForm"
    />
  </div>
  <div>
    <DsfrTable
      data-testid="tokenTable"
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
  <DsfrModal
    v-model:opened="deleteModalOpened"
    title="Confirmer la suppression du token"
    :is-alert="true"
    @close="closeModal"
    @click="(e: MouseEvent | TouchEvent) => clickInDialog(e, closeModal)"
  >
    <DsfrButton
      data-testid="confirmDeletionBtn"
      label="Supprimer"
      secondary
      @click="deleteToken"
    />
  </DsfrModal>
</template>
