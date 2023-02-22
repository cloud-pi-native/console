<script setup>
import { ref } from 'vue'
import { repoSchema, schemaValidator, isValid, instanciateSchema } from 'shared'
import CIForm from './CIForm.vue'

const props = defineProps({
  repo: {
    type: Object,
    default: () => ({
      isInfra: false,
      isPrivate: false,
    }),
  },
  isEditable: {
    type: Boolean,
    default: true,
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
})

const localRepo = ref(props.repo)
const updatedValues = ref({})
const repoToDelete = ref('')
const isDeletingRepo = ref(false)

const updateRepo = (key, value) => {
  localRepo.value[key] = value
  updatedValues.value[key] = true
}

const emit = defineEmits(['add', 'delete', 'cancel'])

const addRepo = () => {
  updatedValues.value = instanciateSchema({ schema: repoSchema }, true)
  const errorSchema = schemaValidator(repoSchema, localRepo.value)

  if (Object.keys(errorSchema).length === 0) {
    emit('add', localRepo.value)
  }
}

const cancel = (event) => {
  emit('cancel', event)
}

</script>

<template>
  <div
    v-if="isOwner"
    data-testid="deleteRepoZone"
    class="fr-my-2w fr-py-4w fr-px-1w border-solid border-1 rounded-sm border-red-500"
  >
    <div class="flex justify-between items-center <md:flex-col">
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
  <h1
    v-if="props.isEditable"
    class="fr-h1"
  >
    Ajouter un dépôt au projet
  </h1>
  <DsfrFieldset
    :legend="props.isEditable ? 'Informations du dépôt' : undefined"
    :hint="props.isEditable ? 'Les champs munis d\'une astérisque (*) sont requis' : undefined"
  >
    <DsfrFieldset
      :key="repo"
      data-testid="repoFieldset"
      legend="Dépôt Git"
    >
      <DsfrInput
        v-model="localRepo.internalRepoName"
        data-testid="internalRepoNameInput"
        type="text"
        required="required"
        :disabled="!props.isEditable"
        :is-valid="!!updatedValues.internalRepoName && isValid(repoSchema, localRepo, 'internalRepoName')"
        :is-invalid="!!updatedValues.internalRepoName && !isValid(repoSchema, localRepo, 'internalRepoName')"
        label="Nom du dépôt Git interne"
        label-visible
        hint="Nom du dépôt Git créé dans le Gitlab interne de la plateforme"
        placeholder="candilib"
        class="fr-mb-2w"
        @update:model-value="updateRepo('internalRepoName', $event)"
      />
      <DsfrInput
        v-model="localRepo.externalRepoUrl"
        data-testid="externalRepoUrlInput"
        type="text"
        required="required"
        :disabled="!props.isEditable"
        :is-valid="!!updatedValues.externalRepoUrl && isValid(repoSchema, localRepo, 'externalRepoUrl')"
        :is-invalid="!!updatedValues.externalRepoUrl && !isValid(repoSchema, localRepo, 'externalRepoUrl')"
        label="Url du dépôt Git externe"
        label-visible
        hint="Url du dépôt Git qui servira de source pour la synchronisation"
        placeholder="https://github.com/dnum-mi/dso-console.git"
        class="fr-mb-2w"
        @update:model-value="updateRepo('externalRepoUrl', $event)"
      />
      <DsfrCheckbox
        v-model="localRepo.isPrivate"
        data-testid="privateRepoCbx"
        :disabled="!props.isEditable"
        label="Dépôt source privé"
        hint="Cochez la case si le dépôt Git source est privé"
        name="isGitSourcePrivate"
        @update:model-value="updateRepo('isPrivate', $event)"
      />
      <div
        v-if="localRepo.isPrivate"
      >
        <DsfrInput
          v-model="localRepo.externalUserName"
          data-testid="externalUserNameInput"
          type="text"
          :required="localRepo.isPrivate ? 'required' : false"
          :disabled="!props.isEditable"
          :is-valid="!!updatedValues.externalUserName && isValid(repoSchema, localRepo, 'externalUserName')"
          :is-invalid="!!updatedValues.externalUserName && !isValid(repoSchema, localRepo, 'externalUserName')"
          autocomplete="name"
          label="Nom d'utilisateur"
          label-visible
          hint="Nom de l'utilisateur propriétaire du token"
          placeholder="this-is-tobi"
          class="fr-mb-2w"
          @update:model-value="updateRepo('externalUserName', $event)"
        />
        <DsfrInput
          v-model="localRepo.externalToken"
          data-testid="externalTokenInput"
          type="text"
          :required="localRepo.isPrivate ? 'required' : false"
          :disabled="!props.isEditable"
          :is-valid="!!updatedValues.externalToken && isValid(repoSchema, localRepo, 'externalToken')"
          :is-invalid="!!updatedValues.externalToken && !isValid(repoSchema, localRepo, 'externalToken')"
          label="Token d'accès au dépôt Git externe"
          label-visible
          hint="Token d'accès permettant le clone du dépôt par la chaîne DevSecOps"
          placeholder="hoqjC1vXtABzytBIWBXsdyzubmqMYkgA"
          class="fr-mb-2w"
          @update:model-value="updateRepo('externalToken', $event)"
        />
      </div>
      <DsfrCheckbox
        v-model="localRepo.isInfra"
        data-testid="infraRepoCbx"
        :disabled="!props.isEditable"
        label="Dépôt d'infrastructure"
        hint="Cochez la case s'il s'agit d'un dépôt d'infrastructure"
        name="infraRepoCbx"
        @update:model-value="updateRepo('isInfra', $event)"
      />
      <CIForm
        v-if="props.isEditable"
        :internal-repo-name="localRepo.internalRepoName"
      />
    </DsfrFieldset>
  </DsfrFieldset>
  <div
    v-if="props.isEditable"
    class="flex space-x-10 mt-5"
  >
    <DsfrButton
      label="Ajouter le dépôt"
      data-testid="addRepoBtn"
      primary
      icon="ri-upload-cloud-line"
      @click="addRepo()"
    />
    <DsfrButton
      label="Annuler"
      data-testid="cancelRepoBtn"
      secondary
      icon="ri-close-line"
      @click="cancel()"
    />
  </div>
</template>
