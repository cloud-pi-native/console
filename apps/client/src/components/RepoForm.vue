<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { Repo, SharedZodError } from '@cpn-console/shared'
import { CreateRepoFormSchema, RepoFormSchema, UpdateRepoFormSchema, deleteValidationInput, fakeToken, instanciateSchema } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'

type RepoForm = Partial<Repo> & { isStandalone?: boolean }
const props = withDefaults(defineProps<{
  repo: RepoForm
  canManage: boolean
  isProjectLocked: boolean
}>(), {
  repo: () => ({
    isInfra: false,
    isPrivate: false,
    isAutoSynced: false,
    internalRepoName: '',
    externalRepoUrl: '',
    isStandalone: false,
  }),
  canManage: false,
  isProjectLocked: false,
})

const emit = defineEmits(['save', 'delete', 'cancel'])
const isExistingAndPrivate = props.repo.id && props.repo.isPrivate
const initialToken = isExistingAndPrivate ? fakeToken : ''

const localRepo = ref<RepoForm>({
  ...props.repo,
  ...isExistingAndPrivate && { externalToken: fakeToken },
  isStandalone: !!(props.repo.id && !props.repo.externalRepoUrl), // key present only in frontend for form
})
const updatedValues = ref<Record<keyof Omit<typeof localRepo.value, 'id' | 'projectId'>, boolean>>(instanciateSchema(RepoFormSchema, false))

const repoToDelete = ref('')
const isDeletingRepo = ref(false)
const isPassword = ref(true)

const errorSchema = computed<SharedZodError | undefined>(() => {
  let schemaValidation
  if (localRepo.value.id) {
    schemaValidation = UpdateRepoFormSchema.safeParse(localRepo.value)
  } else {
    schemaValidation = CreateRepoFormSchema.safeParse(localRepo.value)
  }
  return schemaValidation.success ? undefined : schemaValidation.error
})
const isRepoValid = computed(() => !errorSchema.value)

function updateRepo<K extends keyof Omit<typeof localRepo.value, 'id' | 'projectId'>>(key: K, value: typeof localRepo.value[K]) {
  localRepo.value[key] = value
  updatedValues.value[key] = true

  if (key === 'externalRepoUrl' && value === '') {
    localRepo.value.isPrivate = false
    localRepo.value.externalUserName = undefined
    localRepo.value.externalToken = undefined
  }

  if (key === 'isPrivate') {
    localRepo.value.externalUserName = undefined
    localRepo.value.externalToken = undefined
  }
}

function saveRepo() {
  if (localRepo.value.isStandalone) {
    updateRepo('externalRepoUrl', '')
  }
  updatedValues.value = instanciateSchema(RepoFormSchema.omit({ id: true, projectId: true }), true)

  if (!isRepoValid.value) return
  emit('save', localRepo.value)
}

function cancel() {
  emit('cancel')
}

function resetToken() {
  localRepo.value.externalToken = initialToken
  updatedValues.value.externalToken = false
  isPassword.value = true
}

function checkEditToken() {
  if (localRepo.value.externalToken === fakeToken) {
    localRepo.value.externalToken = ''
    updatedValues.value.externalToken = true
  }
}

function toggleTokenInputType() {
  checkEditToken()
  isPassword.value = !isPassword.value
}
function toggleStandalone(e: boolean) {
  updateRepo('isStandalone', e)
  updateRepo('externalRepoUrl', localRepo.value.externalRepoUrl ?? '')
}
</script>

<template>
  <div
    data-testid="repo-form"
    class="relative"
  >
    <h2
      class="fr-h2 fr-mt-2w"
    >
      {{ localRepo.id ? `Modifier le dépôt ${localRepo.internalRepoName}` : 'Ajouter un dépôt au projet' }}
    </h2>
    <DsfrFieldset
      legend="Informations du dépôt"
      hint="Les champs munis d'une astérisque (*) sont requis"
    >
      <DsfrFieldset
        data-testid="repoFieldset"
        legend="Dépôt Git"
      >
        <div class="fr-mb-2w">
          <DsfrInputGroup
            v-model="localRepo.internalRepoName"
            data-testid="internalRepoNameInput"
            type="text"
            :required="true"
            :disabled="localRepo.id || props.isProjectLocked || !canManage"
            :error-message="!!updatedValues.internalRepoName && errorSchema?.flatten().fieldErrors.internalRepoName"
            label="Nom du dépôt Git interne"
            label-visible
            hint="Nom du dépôt Git créé dans le Gitlab interne de la plateforme"
            placeholder="candilib"
            @update:model-value="updateRepo('internalRepoName', $event)"
          />
        </div>
        <DsfrCheckbox
          id="infraRepoCbx"
          v-model="localRepo.isInfra"
          :disabled="props.isProjectLocked || !canManage"
          label="Dépôt contenant du code d'infrastructure"
          hint="Cochez la case s'il s'agit d'un dépôt d'infrastructure (si le dépôt contient des manifestes de déploiement)"
          name="infraRepoCbx"
          @update:model-value="updateRepo('isInfra', $event)"
        />
        <DsfrToggleSwitch
          v-model="localRepo.isStandalone"
          data-testid="standaloneRepoSwitch"
          :disabled="props.isProjectLocked || !canManage"
          label="Dépôt sans source git externe"
          name="standaloneRepoSwitch"
          class="mb-5"
          no-text
          :border-bottom="true"
          @update:model-value="(e: boolean) => toggleStandalone(e)"
        />
      </DsfrFieldset>
      <DsfrFieldset
        v-if="!localRepo.isStandalone"
        legend="Source externe"
      >
        <div class="fr-mb-2w">
          <DsfrInputGroup
            v-model="localRepo.externalRepoUrl"
            data-testid="externalRepoUrlInput"
            type="text"
            :disabled="props.isProjectLocked || !canManage"
            :required="true"
            :error-message="!!updatedValues.externalRepoUrl && errorSchema?.flatten().fieldErrors.externalRepoUrl"
            label="Url du dépôt Git externe"
            label-visible
            hint="Url du dépôt Git source pour la synchronisation"
            placeholder="https://github.com/cloud-pi-native/console.git"
            class="fr-mb-2w"
            @update:model-value="updateRepo('externalRepoUrl', $event)"
          />
        </div>
        <DsfrCheckbox
          id="autoSyncCheckbox"
          v-model="localRepo.isAutoSynced"
          :disabled="props.isProjectLocked || !canManage"
          label="Synchronisation automatique du projet"
          hint="Si vous travaillez depuis GitHub ou un repo publique, vous pouvez cocher cette case pour synchroniser automatiquement le projet"
          name="isAutoSynced"
          @update:model-value="updateRepo('isAutoSynced', $event)"
        />
        <DsfrCheckbox
          id="privateRepoCbx"
          v-model="localRepo.isPrivate"
          :disabled="props.isProjectLocked || !canManage"
          label="Dépôt source privé"
          hint="Cochez la case si le dépôt Git source est privé"
          name="isGitSourcePrivate"
          @update:model-value="updateRepo('isPrivate', $event)"
        />
        <div
          v-if="localRepo.isPrivate"
        >
          <div class="fr-mb-2w">
            <DsfrInputGroup
              :error-message="(updatedValues.externalUserName || updatedValues.externalToken) && errorSchema?.flatten().fieldErrors.credentials"
            >
              <DsfrInput
                v-model="localRepo.externalUserName"
                data-testid="externalUserNameInput"
                type="text"
                :required="localRepo.isPrivate"
                :disabled="props.isProjectLocked || !canManage"
                label="Nom d'utilisateur"
                label-visible
                hint="Nom de l'utilisateur propriétaire du token"
                :error-message="!!updatedValues.externalToken && errorSchema?.flatten().fieldErrors.externalUserName"
                placeholder="this-is-tobi"
                class="fr-mb-2w"
                @update:model-value="updateRepo('externalUserName', $event)"
              />
              <div class="fr-mb-2w flex items-end">
                <div
                  class="w-full"
                >
                  <DsfrInput
                    v-model="localRepo.externalToken"
                    data-testid="externalTokenInput"
                    :type="isPassword ? 'password' : 'text'"
                    :required="localRepo.isPrivate"
                    :disabled="props.isProjectLocked || !canManage"
                    label="Token d'accès au dépôt Git source"
                    label-visible
                    hint="Token d'accès permettant le clone du dépôt Git source par la chaîne DevSecOps."
                    :error-message="!!updatedValues.externalToken && errorSchema?.flatten().fieldErrors.externalToken"
                    placeholder="hoqjC1vXtABzytBIWBXsdyzubmqMYkgA"
                    autocomplete="off"
                    @update:model-value="updateRepo('externalToken', $event)"
                    @click="checkEditToken"
                  />
                </div>
                <v-icon
                  :name="isPassword ? 'ri:eye-line' : 'ri:eye-off-line'"
                  data-testid="toggleTokenDisplayButton"
                  class="-ml-8 mb-2 z-1 cursor-pointer"
                  :title="isPassword ? 'Afficher le token en clair' : 'Masquer le token'"
                  @click="toggleTokenInputType"
                />
                <v-icon
                  v-if="isExistingAndPrivate && localRepo.externalToken !== initialToken"
                  data-testid="resetTokenButton"
                  name="ri:restart-line"
                  title="Annuler la modification"
                  class="-ml-12 mb-2 z-1 cursor-pointer"
                  @click="resetToken"
                />
              </div>
            </DsfrInputGroup>
          </div>
          <DsfrAlert
            v-if="isExistingAndPrivate && updatedValues.externalToken"
            data-testid="warningSecretChanged"
            description="Le secret actuel sera écrasé."
            small
            type="warning"
            class="w-max"
          />
        </div>
      </DsfrFieldset>
      <div
        v-if="!props.isProjectLocked && canManage"
        class="flex space-x-10 mt-5"
      >
        <DsfrButton
          :label="localRepo.id ? 'Enregistrer' : 'Ajouter le dépôt'"
          :data-testid="localRepo.id ? 'updateRepoBtn' : 'addRepoBtn'"
          :disabled="!isRepoValid"
          primary
          icon="ri:upload-cloud-line"
          @click="saveRepo()"
        />
        <DsfrButton
          label="Annuler"
          data-testid="cancelRepoBtn"
          secondary
          icon="ri:close-line"
          @click="cancel()"
        />
      </div>
    </DsfrFieldset>
    <div
      v-if="canManage && localRepo.id"
      data-testid="deleteRepoZone"
      class="danger-zone"
    >
      <div class="danger-zone-btns">
        <DsfrButton
          v-show="!isDeletingRepo"
          data-testid="showDeleteRepoBtn"
          :label="`Retirer le dépôt ${localRepo.internalRepoName} du projet`"
          secondary
          :disabled="props.isProjectLocked"
          icon="ri:delete-bin-7-line"
          @click="isDeletingRepo = true"
        />
        <DsfrAlert
          class="<md:mt-2"
          :description="props.isProjectLocked ? 'Impossible de supprimer un dépôt lorsque le projet est verrouillé.' : 'Le retrait d\'un dépôt est irréversible.'"
          type="warning"
          small
        />
      </div>
      <div
        v-if="isDeletingRepo"
        class="fr-mt-4w"
      >
        <DsfrInput
          v-model="repoToDelete"
          data-testid="deleteRepoInput"
          :label="`Veuillez taper '${deleteValidationInput}' pour confirmer la suppression du dépôt`"
          label-visible
          :placeholder="deleteValidationInput"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            data-testid="deleteRepoBtn"
            :label="`Supprimer définitivement le dépôt ${localRepo.internalRepoName}`"
            :disabled="repoToDelete !== deleteValidationInput"
            :title="`Supprimer définitivement le dépôt ${localRepo.internalRepoName}`"
            secondary
            icon="ri:delete-bin-7-line"
            @click="$emit('delete', localRepo.id)"
          />
          <DsfrButton
            label="Annuler"
            primary
            @click="isDeletingRepo = false"
          />
        </div>
      </div>
    </div>
    <LoadingCt
      v-if="useSnackbarStore().isWaitingForResponse"
      description="Opérations en cours sur le dépôt"
    />
  </div>
</template>
