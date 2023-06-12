<script setup>
import { ref, computed } from 'vue'
import { repoSchema, schemaValidator, isValid, instanciateSchema } from 'shared'
import CIForm from './CIForm.vue'

const props = defineProps({
  repo: {
    type: Object,
    default: () => ({
      internalRepoName: '',
      externalRepoUrl: '',
      externalUserName: '',
      externalToken: '',
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
  isProjectLocked: {
    type: Boolean,
    default: false,
  },
})

const localRepo = ref(props.repo)
const updatedValues = ref({})
const repoToDelete = ref('')
const isDeletingRepo = ref(false)

const errorSchema = computed(() => schemaValidator(repoSchema, localRepo.value))
const isRepoValid = computed(() => Object.keys(errorSchema.value).length === 0)

const updateRepo = (key, value) => {
  localRepo.value[key] = value
  updatedValues.value[key] = true
}

const emit = defineEmits(['add', 'delete', 'cancel'])

const addRepo = () => {
  updatedValues.value = instanciateSchema({ schema: repoSchema }, true)

  if (isRepoValid.value) emit('add', localRepo.value)
}

const cancel = (event) => {
  emit('cancel', event)
}

</script>

<template>
  <div
    data-testid="repo-form"
  >
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
        <div class="fr-mb-2w">
          <DsfrInputGroup
            v-model="localRepo.internalRepoName"
            data-testid="internalRepoNameInput"
            type="text"
            required="required"
            :disabled="!props.isEditable || props.isProjectLocked"
            :error-message="!!updatedValues.internalRepoName && !isValid(repoSchema, localRepo, 'internalRepoName') ? 'Le nom du dépôt ne doit contenir ni espaces ni caractères spéciaux': undefined"
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
            required="required"
            :disabled="!props.isEditable || props.isProjectLocked"
            :error-message="!!updatedValues.externalRepoUrl && !isValid(repoSchema, localRepo, 'externalRepoUrl') ? 'L\'url du dépôt doit commencer par https et se terminer par .git': undefined"
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
          :disabled="!props.isEditable || props.isProjectLocked"
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
              :required="localRepo.isPrivate ? 'required' : false"
              :disabled="!props.isEditable || props.isProjectLocked"
              :error-message="!!updatedValues.externalUserName && !isValid(repoSchema, localRepo, 'externalUserName') ? 'Le nom du propriétaire du token est obligatoire en cas de dépôt privé et ne doit contenir ni espaces ni caractères spéciaux': undefined"
              autocomplete="name"
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
              :required="localRepo.isPrivate ? 'required' : false"
              :disabled="!props.isEditable || props.isProjectLocked"
              :error-message="!!updatedValues.externalToken && !isValid(repoSchema, localRepo, 'externalToken') ? 'Le token d\'accès au dépôt est obligatoire en cas de dépôt privé et ne doit contenir ni espaces ni caractères spéciaux': undefined"
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
          :disabled="!props.isEditable || props.isProjectLocked"
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
      v-if="props.isEditable && !props.isProjectLocked"
      class="flex space-x-10 mt-5"
    >
      <DsfrButton
        label="Ajouter le dépôt"
        data-testid="addRepoBtn"
        :disabled="!isRepoValid"
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
    <div
      v-if="isOwner"
      data-testid="deleteRepoZone"
      class="danger-zone"
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
  </div>
</template>
