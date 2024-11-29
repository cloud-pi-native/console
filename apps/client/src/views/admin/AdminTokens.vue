<script lang="ts" setup>
import { onMounted } from 'vue'
import { type AdminToken, getAdminPermLabelsByValue } from '@cpn-console/shared'
import { useAdminTokenStore } from '@/stores/admin-token.js'
import type { SimpleToken } from '@/components/TokenForm.vue'

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
      no-caption
      title=""
      data-testid="tokenTable"
      :headers="headers"
    >
      <tr
        v-for="token in tokens"
        :key="token.id"
      >
        <td>{{ token.name }}</td>
        <td>{{ getAdminPermLabelsByValue(token.permissions).join(', ') }}</td>
        <td>
          <UserCt
            v-if="token.owner"
            :user="token.owner"
            size="sm"
            mode="short"
          />
        </td>
        <td>{{ (new Date(token.createdAt)).toLocaleString() }}</td>
        <td>{{ token.expirationDate ? (new Date(token.expirationDate)).toLocaleString() : 'Jamais' }}</td>
        <td>{{ token.lastUse ? (new Date(token.lastUse)).toLocaleString() : 'Jamais' }}</td>
        <td>{{ statusWording[token.status] }}</td>
        <td
          title="Supprimer"
          :class="`fr-fi-close-line justify-center ${token.status === 'active' ? 'cursor-pointer fr-text-default--warning' : 'cursor-not-allowed'}`"
          @click="() => { deleteModalOpened = true; deleteTokenId = token.id }"
        >
          <v-icon />
        </td>
      </tr>
      <tr
        v-if="!tokens.length"
      >
        Aucune clé d\'api existante
      </tr>
    </DsfrTable>
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
