<script setup>
import { ref } from 'vue'
import { repoSchema } from 'shared/src/projects/schema.js'
import { schemaValidator, isValid, getTruthySchema } from '../utils/func.js'

const props = defineProps({
  repo: {
    type: Object,
    default: () => {},
  },
  isEditable: {
    type: Boolean,
    default: true,
  },
})

const localRepo = ref(props.repo)
const updatedValues = ref({})

const updateRepo = (key, value) => {
  localRepo.value[key] = value
  updatedValues.value[key] = true
}

const emit = defineEmits(['add', 'cancel'])

const addRepo = () => {
  updatedValues.value = getTruthySchema({ schema: repoSchema })
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
  <h1 v-if="props.isEditable">
    Ajouter un dépôt au projet
  </h1>
  <DsfrFieldset
    :legend="props.isEditable ? 'Informations du dépôt' : undefined"
    :hint="props.isEditable ? 'Tous les champs sont requis' : undefined"
  >
    <DsfrFieldset
      :key="repo"
      :data-testid="repoFieldset"
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
        placeholder="https://github.com/dnum-mi/dso-console"
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
    </DsfrFieldset>
  </DsfrFieldset>
  <div
    v-if="props.isEditable"
    class="flex space-x-10 mt-5"
  >
    <DsfrButton
      label="Ajouter le dépôt"
      data-testid="addRepoBtn"
      secondary
      icon="ri-upload-cloud-line"
      @click="addRepo()"
    />
    <DsfrButton
      label="Annuler"
      data-testid="cancelBtn"
      secondary
      icon="ri-close-line"
      @click="cancel()"
    />
  </div>
</template>
