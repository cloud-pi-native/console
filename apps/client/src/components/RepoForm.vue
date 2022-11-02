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
        v-model="localRepo.gitName"
        data-testid="gitNameInput"
        type="text"
        required="required"
        :disabled="!props.isEditable"
        :is-valid="!!updatedValues.gitName && isValid(repoSchema, localRepo, 'gitName')"
        :is-invalid="!!updatedValues.gitName && !isValid(repoSchema, localRepo, 'gitName')"
        label="Nom du dépôt Git interne"
        label-visible
        hint="Nom du dépôt Git créé dans le Gitlab interne de la plateforme"
        placeholder="candilib"
        class="fr-mb-2w"
        @update:model-value="updateRepo('gitName', $event)"
      />
      <DsfrInput
        v-model="localRepo.gitSourceName"
        data-testid="gitSrcNameInput"
        type="text"
        required="required"
        :disabled="!props.isEditable"
        :is-valid="!!updatedValues.gitSourceName && isValid(repoSchema, localRepo, 'gitSourceName')"
        :is-invalid="!!updatedValues.gitSourceName && !isValid(repoSchema, localRepo, 'gitSourceName')"
        label="Url du dépôt Git externe"
        label-visible
        hint="Url du dépôt Git qui servira de source pour la synchronisation"
        placeholder="https://github.com/dnum-mi/dso-console"
        class="fr-mb-2w"
        @update:model-value="updateRepo('gitSourceName', $event)"
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
          v-model="localRepo.userName"
          data-testid="userNameInput"
          type="text"
          :required="localRepo.isPrivate ? 'required' : false"
          :disabled="!props.isEditable"
          :is-valid="!!updatedValues.userName && isValid(repoSchema, localRepo, 'userName')"
          :is-invalid="!!updatedValues.userName && !isValid(repoSchema, localRepo, 'userName')"
          autocomplete="name"
          label="Nom d'utilisateur"
          label-visible
          hint="Nom de l'utilisateur propriétaire du token"
          placeholder="this-is-tobi"
          class="fr-mb-2w"
          @update:model-value="updateRepo('userName', $event)"
        />
        <DsfrInput
          v-model="localRepo.gitToken"
          data-testid="gitTokenInput"
          type="text"
          :required="localRepo.isPrivate ? 'required' : false"
          :disabled="!props.isEditable"
          :is-valid="!!updatedValues.gitToken && isValid(repoSchema, localRepo, 'gitToken')"
          :is-invalid="!!updatedValues.gitToken && !isValid(repoSchema, localRepo, 'gitToken')"
          label="Token d'accès au dépôt Git externe"
          label-visible
          hint="Token d'accès permettant le clone du dépôt par la chaîne DevSecOps"
          placeholder="hoqjC1vXtABzytBIWBXsdyzubmqMYkgA"
          class="fr-mb-2w"
          @update:model-value="updateRepo('gitToken', $event)"
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
