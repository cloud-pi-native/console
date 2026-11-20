<script lang="ts" setup>
import type { AdminToken } from '@cpn-console/shared'
import type { SimpleToken } from '@/components/TokenForm.vue'
import { getAdminPermLabelsByValue } from '@cpn-console/shared'
import { DsfrDataTable } from '@gouvminint/vue-dsfr'
import { onMounted } from 'vue'
import { useAdminTokenStore } from '@/stores/admin-token.js'
import { clickInDialog, getRandomId } from '@/utils/func.js'

const statusWording: Record<AdminToken['status'], string> = {
  active: 'Actif',
  revoked: 'Révoqué',
  inactive: 'Inactif',
}
// DsfrDataTable hands `row[colKey] ?? row` to the `cell` slot: a key that also
// exists on the token (or a nullish value) swaps the row for a raw value. The
// `Cell` suffix keeps every column on the row, as ListClusters already does.
const columns = [
  { key: 'nameCell', label: 'Nom' },
  { key: 'permissionsCell', label: 'Permissions' },
  { key: 'ownerCell', label: 'Créateur' },
  { key: 'createdAtCell', label: 'Date de création' },
  { key: 'expirationDateCell', label: 'Date d\'expiration' },
  { key: 'lastUseCell', label: 'Dernière utilisation' },
  { key: 'statusCell', label: 'État' },
  { key: 'revokeCell', label: 'Révoquer' },
]
const adminTokenStore = useAdminTokenStore()

const tokens = ref<AdminToken[]>([])
const displayRevoked = ref(false)
const displayNewTokenForm = ref(false)
const deleteTokenId = ref('')
const deleteModalOpened = ref(false)
const tableKey = ref(getRandomId('table'))

function tokenDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString() : 'Jamais'
}

function compareTokens(a: AdminToken, b: AdminToken) {
  const aUse = a.lastUse
  const bUse = b.lastUse
  if (aUse === bUse)
    return 0
  if (aUse === null)
    return 1
  if (bUse === null)
    return -1
  return aUse.localeCompare(bUse)
}

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
  <span
    v-if="!tokens.length"
    data-testid="noTokenMsg"
  >
    Aucune clé d'api existante
  </span>
  <DsfrDataTable
    v-else
    :key="tableKey"
    title=""
    data-testid="tokenTable"
    :headers-row="columns"
    :rows="tokens"
    :sortable-rows="['lastUseCell']"
    :sort-fn="compareTokens"
  >
    <template #cell="{ colKey, cell }">
      <template v-if="colKey === 'nameCell'">
        {{ (cell as AdminToken).name }}
      </template>
      <template v-else-if="colKey === 'permissionsCell'">
        {{ getAdminPermLabelsByValue((cell as AdminToken).permissions).join(', ') }}
      </template>
      <template v-else-if="colKey === 'ownerCell'">
        {{ (cell as AdminToken).owner?.email ?? '-' }}
      </template>
      <template v-else-if="colKey === 'createdAtCell'">
        <span :title="(cell as AdminToken).createdAt">
          {{ tokenDate((cell as AdminToken).createdAt) }}
        </span>
      </template>
      <template v-else-if="colKey === 'expirationDateCell'">
        <span :title="(cell as AdminToken).expirationDate ?? undefined">
          {{ tokenDate((cell as AdminToken).expirationDate) }}
        </span>
      </template>
      <template v-else-if="colKey === 'lastUseCell'">
        <span :title="(cell as AdminToken).lastUse ?? undefined">
          {{ tokenDate((cell as AdminToken).lastUse) }}
        </span>
      </template>
      <template v-else-if="colKey === 'statusCell'">
        {{ statusWording[(cell as AdminToken).status] }}
      </template>
      <template v-else>
        <button
          type="button"
          data-testid="revokeBtn"
          class="fr-fi-close-line justify-center"
          :class="(cell as AdminToken).status === 'active' ? 'cursor-pointer fr-text-default--warning' : 'cursor-not-allowed'"
          title="Supprimer"
          @click="() => { deleteModalOpened = true; deleteTokenId = (cell as AdminToken).id }"
        />
      </template>
    </template>
  </DsfrDataTable>
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
