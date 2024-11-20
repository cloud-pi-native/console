<script lang="ts" setup>
import { TokenSchema, isAtLeastTomorrow } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { copyContent } from '@/utils/func.js'

export interface SimpleToken { name: string, expirationDate: string }
const props = defineProps<{
  exposedToken?: string
  mandatoryExpiration: boolean
}>()

const emits = defineEmits<{
  create: [SimpleToken]
  reset: []
}>()

const snackbarStore = useSnackbarStore()

const showNewTokenPassword = ref(false)
const isCreatingToken = ref(false)
const newToken = ref<{
  name: string
  expirationDate: string
}>({
  name: '',
  expirationDate: '',
})
const showNewTokenForm = ref<boolean>(false)

async function createToken() {
  try {
    snackbarStore.hideMessage()
    if (!newToken.value.name) {
      return
    }
    isCreatingToken.value = true
    emits('create', newToken.value)
    newToken.value.name = ''
    newToken.value.expirationDate = ''
    showNewTokenForm.value = false
  } catch (error) {
    if (error instanceof Error) {
      snackbarStore.setMessage(error.message, 'error')
    }
  }
  isCreatingToken.value = false
}

function reset() {
  showNewTokenForm.value = true
  showNewTokenPassword.value = false
  emits('reset')
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

const schema = computed(() => {
  return TokenSchema.partial().safeParse(newToken.value)
})
</script>

<template>
  <div
    v-if="props.exposedToken"
    class="flex flex-row items-end gap-1 mb-5 max-w-160"
  >
    <div
      class="grow max-w-130"
    >
      <DsfrInput
        v-model="(props.exposedToken as string)"
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
      @click="() => copyContent(props.exposedToken as string)"
    />
  </div>
  <DsfrButton
    v-if="exposedToken"
    label="Créer un nouveau jeton"
    data-testid="showNewTokenFormBtn"
    secondary
    @click="reset"
  />
  <DsfrFieldset
    v-else
    legend="Créer un jeton"
    class="max-w-160 w-full"
  >
    <DsfrInputGroup
      :error-message="newToken.name && schema?.error?.flatten().fieldErrors.name"
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
        :required="mandatoryExpiration"
      />
    </DsfrInputGroup>
    <div
      class="flex flex-row place-content-between"
    >
      <DsfrButton
        data-testid="saveBtn"
        label="Enregistrer"
        secondary
        :icon="isCreatingToken
          ? { name: 'ri:refresh-fill', animation: 'spin' }
          : 'ri:send-plane-line'"
        :disabled="!schema.success || !!invalidExpirationDate || isCreatingToken || (mandatoryExpiration && !newToken.expirationDate)"
        class="mr-5"
        @click="createToken"
      />
    </div>
  </DsfrFieldset>
</template>
