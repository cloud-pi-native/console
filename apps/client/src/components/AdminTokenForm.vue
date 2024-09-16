<script lang="ts" setup>
import type { ExposedAdminToken, SharedZodError } from '@cpn-console/shared'
import { useAdminTokenStore } from '@/stores/admin-token.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { copyContent } from '@/utils/func.js'
import { AdminTokenSchema, isAtLeastTomorrow } from '@cpn-console/shared'

const emits = defineEmits<{
  create: []
}>()

const snackbarStore = useSnackbarStore()
const adminTokenStore = useAdminTokenStore()

const exposedToken = ref<ExposedAdminToken>()
const showNewTokenPassword = ref(true)
const isCreatingToken = ref(false)
const newToken = ref<{
  name: string
  permissions: bigint
  expirationDate: string
}>({
  name: '',
  permissions: 2n,
  expirationDate: '',
})
const showNewTokenForm = ref<boolean>(false)

async function createToken() {
  try {
    snackbarStore.hideMessage()
    isCreatingToken.value = true
    exposedToken.value = await adminTokenStore.createToken({
      name: newToken.value.name,
      permissions: newToken.value.permissions.toString(),
      expirationDate: newToken.value.expirationDate ?? null,
    })
    showNewTokenForm.value = false
    newToken.value.name = ''
    emits('create')
  } catch (error) {
    if (error instanceof Error) {
      snackbarStore.setMessage(error.message, 'error')
    }
  }
  isCreatingToken.value = false
}

const invalidExpirationDate = computed<string | undefined>(() => {
  if (!newToken.value.expirationDate) {
    return undefined
  }
  const actualTime = new Date(newToken.value.expirationDate)
  return isAtLeastTomorrow(actualTime)
    ? undefined
    : 'La durée de vie du token est trop courte'
})

const errorSchema = computed<SharedZodError | undefined>(() => {
  const schemaValidation = AdminTokenSchema.partial().safeParse(newToken.value)

  return schemaValidation.success ? undefined : schemaValidation.error
})
</script>

<template>
  <div
    v-if="exposedToken"
    class="flex flex-row items-end gap-1 mb-5 max-w-160"
  >
    <div
      class="grow max-w-130"
    >
      <DsfrInput
        v-model="exposedToken.password"
        label="Jeton d'authentification"
        data-testid="newTokenPassword"
        disabled
        :type="showNewTokenPassword ? 'text' : 'password'"
        label-visible
      />
    </div>
    <DsfrButton
      class="h-min align-bottom"
      icon-only
      secondary
      data-testid="showNewTokenPassword"
      :icon="showNewTokenPassword ? 'ri:eye-off-line' : 'ri:eye-line'"
      @click="showNewTokenPassword = !showNewTokenPassword"
    />
    <DsfrButton
      class="h-min align-bottom"
      label="Copier"
      data-testid="copyNewTokenPassword"
      icon-only
      secondary
      icon="ri:clipboard-line"
      @click="copyContent(exposedToken.password)"
    />
  </div>
  <DsfrButton
    v-if="!showNewTokenForm"
    :label=" exposedToken ? 'Créer un nouveau jeton' : 'Créer un jeton'"
    data-testid="showNewTokenFormBtn"
    secondary
    @click="() => { showNewTokenForm = true; showNewTokenPassword = false; exposedToken = undefined }"
  />
  <DsfrFieldset
    v-if="showNewTokenForm"
    legend="Créer un jeton"
    class="max-w-160 w-full"
  >
    <LoadingCt
      v-if="isCreatingToken"
      description="Création en cours"
    />
    <DsfrInputGroup
      :error-message="newToken.name && errorSchema?.flatten().fieldErrors.name"
    >
      <DsfrInput
        v-model="newToken.name"
        data-testid="newTokenName"
        label="Nom du jeton"
        label-visible
        placeholder="name"
        class="mb-5 w-min"
        required
      />
    </DsfrInputGroup>
    <DsfrInputGroup
      :error-message="invalidExpirationDate"
    >
      <DsfrInput
        v-model="newToken.expirationDate"
        type="date"
        data-testid="expirationDateInput"
        label="Date d'expiration"
        label-visible
        class="mr-5 w-min"
      />
    </DsfrInputGroup>
    <div
      class="flex flex-row place-content-between"
    >
      <DsfrButton
        data-testid="saveBtn"
        label="Enregistrer"
        secondary
        :disabled="errorSchema ?? invalidExpirationDate"
        class="mr-5"
        @click="createToken"
      />
    </div>
  </DsfrFieldset>
</template>
