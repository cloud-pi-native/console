<script lang="ts" setup>
import { ref, computed } from 'vue'
import { SharedZodError, RepoBusinessSchema, RepoSchema, CreateRepoBusinessSchema, instanciateSchema, type Repo } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = withDefaults(defineProps<{
  repo: Partial<Repo>,
  isOwner: boolean,
  isProjectLocked: boolean,
}>(), {
  repo: () => ({ isInfra: false, isPrivate: false }),
  isOwner: false,
  isProjectLocked: false,
})

const localRepo = ref(props.repo)
const updatedValues = ref<Record<keyof typeof localRepo.value, boolean>>(instanciateSchema(RepoSchema, false))
const repoToDelete = ref('')
const isDeletingRepo = ref(false)

const errorSchema = computed<SharedZodError | undefined>(() => {
  let schemaValidation
  if (localRepo.value.id) {
    schemaValidation = RepoBusinessSchema.safeParse(localRepo.value)
  } else {
    schemaValidation = CreateRepoBusinessSchema.safeParse(localRepo.value)
  }
  return schemaValidation.success ? undefined : schemaValidation.error
})
const isRepoValid = computed(() => !errorSchema.value)

const updateRepo = (key: keyof typeof localRepo.value, value: unknown) => {
  localRepo.value[key] = value
  updatedValues.value[key] = true

  if (key === 'isPrivate') {
    localRepo.value.externalUserName = undefined
    localRepo.value.externalToken = undefined
  }
}

const emit = defineEmits(['save', 'delete', 'cancel'])

const saveRepo = () => {
  updatedValues.value = instanciateSchema(RepoSchema.omit({ id: true, projectId: true }), true)

  if (!isRepoValid.value) return
  emit('save', localRepo.value)
}

const cancel = () => {
  emit('cancel')
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
      hint="Les champs munis d\'une astérisque (*) sont requis"
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
            :disabled="localRepo.id || props.isProjectLocked"
            :error-message="!!updatedValues.internalRepoName && !RepoSchema.pick({internalRepoName: true}).safeParse({internalRepoName: localRepo.internalRepoName}).success ? 'Le nom du dépôt ne doit contenir ni majuscules, ni espaces, ni caractères spéciaux hormis le trait d\'union, et doit commencer et se terminer par un caractère alphanumérique': undefined"
            label="Nom du dépôt Git interne"
            label-visible
            hint="Nom du dépôt Git créé dans le Gitlab interne de la plateforme"
            placeholder="candilib"
            @update:model-value="updateRepo('internalRepoName', $event)"
          />
        </div>
        <div class="fr-mb-2w">
          <DsfrInputGroup
            v-model="localRepo.externalRepoUrl"
            data-testid="externalRepoUrlInput"
            type="text"
            :required="true"
            :disabled="props.isProjectLocked"
            :error-message="!!updatedValues.externalRepoUrl && !RepoSchema.pick({externalRepoUrl: true}).safeParse({externalRepoUrl: localRepo.externalRepoUrl}).success ? 'L\'url du dépôt doit commencer par https et se terminer par .git': undefined"
            label="Url du dépôt Git externe"
            label-visible
            hint="Url du dépôt Git qui servira de source pour la synchronisation"
            placeholder="https://github.com/cloud-pi-native/console.git"
            class="fr-mb-2w"
            @update:model-value="updateRepo('externalRepoUrl', $event)"
          />
        </div>
        <DsfrCheckbox
          v-model="localRepo.isPrivate"
          data-testid="privateRepoCbx"
          :disabled="props.isProjectLocked"
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
              v-model="localRepo.externalUserName"
              data-testid="externalUserNameInput"
              type="text"
              :required="localRepo.isPrivate"
              :disabled="props.isProjectLocked"
              :error-message="!!updatedValues.externalUserName && !RepoSchema.pick({externalUserName: true}).safeParse({externalUserName: localRepo.externalUserName}).success ? 'Le nom du propriétaire du token est obligatoire en cas de dépôt privé': undefined"
              label="Nom d'utilisateur"
              label-visible
              hint="Nom de l'utilisateur propriétaire du token"
              placeholder="this-is-tobi"
              class="fr-mb-2w"
              @update:model-value="updateRepo('externalUserName', $event)"
            />
          </div>
          <div class="fr-mb-2w">
            <DsfrInputGroup
              v-model="localRepo.externalToken"
              data-testid="externalTokenInput"
              type="text"
              :required="localRepo.isPrivate"
              :disabled="props.isProjectLocked"
              label="Token d'accès au dépôt Git externe"
              label-visible
              hint="Token d'accès permettant le clone du dépôt par la chaîne DevSecOps"
              placeholder="hoqjC1vXtABzytBIWBXsdyzubmqMYkgA"
              class="fr-mb-2w"
              @update:model-value="updateRepo('externalToken', $event)"
            />
          </div>
        </div>
        <DsfrCheckbox
          v-model="localRepo.isInfra"
          data-testid="infraRepoCbx"
          :disabled="localRepo.id || props.isProjectLocked"
          label="Dépôt contenant du code d'infrastructure"
          hint="Cochez la case s'il s'agit d'un dépôt d'infrastructure (si le dépôt contient des manifestes de déploiement)"
          name="infraRepoCbx"
          @update:model-value="updateRepo('isInfra', $event)"
        />
        <CIForm
          :internal-repo-name="localRepo.internalRepoName"
        />
      </DsfrFieldset>
    </DsfrFieldset>
    <div
      v-if="!props.isProjectLocked"
      class="flex space-x-10 mt-5"
    >
      <DsfrButton
        :label="localRepo.id ? 'Enregistrer' : 'Ajouter le dépôt'"
        :data-testid="localRepo.id ? 'updateRepoBtn' : 'addRepoBtn'"
        :disabled="!isRepoValid"
        primary
        icon="ri-upload-cloud-line"
        @click="saveRepo()"
      />
      <DsfrButton
        label="Annuler"
        data-testid="cancelRepoBtn"
        secondary
        icon="ri-close-line"
        @click="cancel()"
      />
    </div>
    <div
      v-if="isOwner"
      data-testid="deleteRepoZone"
      class="danger-zone"
    >
      <div class="danger-zone-btns">
        <DsfrButton
          v-show="!isDeletingRepo"
          data-testid="showDeleteRepoBtn"
          :label="`Retirer le dépôt ${localRepo.internalRepoName} du projet`"
          secondary
          icon="ri-delete-bin-7-line"
          @click="isDeletingRepo = true"
        />
        <DsfrAlert
          class="<md:mt-2"
          description="Le retrait d'un dépôt est irréversible."
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
          :label="`Veuillez taper '${localRepo.internalRepoName}' pour confirmer la suppression du dépôt`"
          label-visible
          :placeholder="localRepo.internalRepoName"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            data-testid="deleteRepoBtn"
            :label="`Supprimer définitivement le dépôt ${localRepo.internalRepoName}`"
            :disabled="repoToDelete !== localRepo.internalRepoName"
            :title="`Supprimer définitivement le dépôt ${localRepo.internalRepoName}`"
            secondary
            icon="ri-delete-bin-7-line"
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
