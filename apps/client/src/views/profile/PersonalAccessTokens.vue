<script lang="ts" setup>
import type { AdminToken, PersonalAccessToken } from '@cpn-console/shared'
import type { SimpleToken } from '@/components/TokenForm.vue'
import { onMounted } from 'vue'
import { useTokenStore } from '@/stores/token.js'
import { clickInDialog } from '@/utils/func.js'

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

async function getAllTokens() {
  tokens.value = await tokenStore.listPersonalAccessTokens()
}

const formProps = ref<{ exposedToken?: string }>({ exposedToken: undefined })
async function createToken(token: SimpleToken) {
  const exposedToken = await tokenStore.createPersonalAccessToken({ ...token, expirationDate: new Date(token.expirationDate) })
  formProps.value.exposedToken = exposedToken.password
  getAllTokens()
}

async function resetForm() {
  formProps.value.exposedToken = undefined
}

onMounted(async () => {
  await getAllTokens()
})

function closeModal() {
  deleteModalOpened.value = false
}
</script>

<template>
  <h1 class="fr-h3">
    Jetons d'API
  </h1>
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
      title=""
      no-caption
      :headers="headers"
    >
      <tr v-if="!tokens.length">
        <td :colspan="headers.length">
          Aucune clé d'api existante
        </td>
      </tr>
      <tr
        v-for="token in tokens"
        v-else
        :key="token.id"
        :data-testid="`token-${token.id}`"
      >
        <td>{{ token.name }}</td>
        <td>{{ (new Date(token.createdAt)).toLocaleString() }}</td>
        <td>{{ token.expirationDate ? (new Date(token.expirationDate)).toLocaleString() : 'Jamais' }}</td>
        <td>{{ token.lastUse ? (new Date(token.lastUse)).toLocaleString() : 'Jamais' }}</td>
        <td>{{ statusWording[token.status] }}</td>
        <td>
          <button
            type="button"
            :class="`fr-fi-close-line justify-center bg-transparent border-none p-0 ${token.status === 'active' ? 'cursor-pointer fr-text-default--warning' : 'cursor-not-allowed'}`"
            title="Supprimer"
            aria-label="Supprimer le jeton"
            :disabled="token.status !== 'active'"
            @click="() => { deleteModalOpened = true; deleteTokenId = token.id }"
          />
        </td>
      </tr>
    </DsfrTable>
  </div>
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
