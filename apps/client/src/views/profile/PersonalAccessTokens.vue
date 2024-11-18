<script lang="ts" setup>
import { onMounted } from 'vue'
import type { AdminToken, PersonalAccessToken } from '@cpn-console/shared'
import { useTokenStore } from '@/stores/token.js'
import type { SimpleToken } from '@/components/TokenForm.vue'

const statusWording: Record<AdminToken['status'], string> = {
  active: 'Actif',
  revoked: 'Révoqué',
  inactive: 'Inactif',
}
const headers = [
  'Nom',
  'Date de création',
  'Date d\'expiration',
  'Dernière utilisation',
  'État',
  'Révoquer',
]
const tokenStore = useTokenStore()

const tokens = ref<PersonalAccessToken[]>([])
const displayNewTokenForm = ref(false)
const deleteTokenId = ref('')
const deleteModalOpened = ref(false)

async function deleteToken() {
  await tokenStore.deletePersonalAccessToken(deleteTokenId.value)
  deleteTokenId.value = ''
  deleteModalOpened.value = false
  await getAllTokens()
}

const rows = computed(() => tokens.value.length
  ? tokens.value.map(token => ([
    token.name,
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
  tokens.value = await tokenStore.listPersonalAccessTokens()
}

const formProps = ref<{ exposedToken?: string }>({ exposedToken: undefined })
async function createToken(token: SimpleToken) {
  const exposedToken = await tokenStore.createPersonalAccessToken(token)
  formProps.value.exposedToken = exposedToken.password
  getAllTokens()
}

async function resetForm() {
  formProps.value.exposedToken = undefined
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
    <DsfrButton
      v-if="!displayNewTokenForm"
      label="Créer un nouveau jeton"
      data-testid="showNewTokenFormBtn"
      secondary
      @click="displayNewTokenForm = true"
    />
    <TokenForm
      v-else
      mandatory-expiration
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
  <DsfrModal
    v-model:opened="deleteModalOpened"
    title="Confirmer la suppression du token"
    :is-alert="true"
    @close="deleteModalOpened = false"
  >
    <DsfrButton
      data-testid="confirmDeletionBtn"
      label="Supprimer"
      secondary
      @click="deleteToken"
    />
  </DsfrModal>
</template>
