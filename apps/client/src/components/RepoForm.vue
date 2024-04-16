<script lang="ts" setup>
import { ref, computed } from 'vue'
import { UpdateRepoBusinessSchema, type Repo, CreateRepoBusinessSchema } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps({
  repo: {
    type: Object,
    default: () => ({
      internalRepoName: '',
      externalRepoUrl: undefined,
      externalUserName: undefined,
      externalToken: undefined,
      isInfra: false,
      isPrivate: false,
      source: 'clone',
    }),
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
const updatedValues = ref<Partial<Repo>>({
  ...localRepo.value.id && { id: localRepo.value.id },
  isPrivate: localRepo.value.isPrivate,
  isInfra: localRepo.value.isInfra,
  source: localRepo.value.source,
  internalRepoName: localRepo.value.internalRepoName,
  externalRepoUrl: localRepo.value.externalRepoUrl,
})

const repoToDelete = ref('')
const isDeletingRepo = ref(false)

const zodSchema = computed(() => updatedValues.value.id
  ? UpdateRepoBusinessSchema.safeParse(updatedValues.value)
  : CreateRepoBusinessSchema.safeParse(updatedValues.value),
)

const isRepoValid = computed(() => !!(zodSchema.value.success))

const updateRepo = (key: keyof Repo, value: unknown) => {
  localRepo.value[key] = value
  // @ts-ignore
  updatedValues.value[key] = value
}

const emit = defineEmits(['save', 'delete', 'cancel'])

const saveRepo = () => {
  if (!zodSchema.value.success) {
    return
  }
  emit('save', updatedValues.value)
}

const cancel = () => {
  emit('cancel')
}
const options = [{
  value: 'clone',
  label: 'Externe',
  hint: 'Depôt cloné de l\'extérieur',
}, {
  value: 'autonomous',
  label: 'Aucune',
  hint: 'Depôt indépendant',
}]

</script>

<template>
  <div
    data-testid="repo-form"
    class="relative"
  >
    <h1
      class="fr-h1 fr-mt-2w"
    >
      {{ localRepo.id ? 'Modifier le dépôt' : 'Ajouter un dépôt au projet' }}
    </h1>
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
            :error-message="zodSchema?.error?.formErrors.fieldErrors?.internalRepoName?.[0]"
            label="Nom du dépôt Git interne"
            label-visible
            hint="Nom du dépôt Git créé dans le Gitlab interne de la plateforme"
            placeholder="candilib"
            @update:model-value="updateRepo('internalRepoName', $event)"
          />
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
        <DsfrRadioButtonSet
          v-model="localRepo.source"
          legend="Source du dépôt"
          name="legend"
          :inline="true"
          :options="options"
          :default="options.find(({ value })=> value === localRepo.source)"
          @update:model-value="updateRepo('source', $event)"
        />
        <div
          v-if="localRepo.source === 'clone'"
        >
          <div
            class="fr-mb-2w"
          >
            <DsfrInputGroup
              v-model="localRepo.externalRepoUrl"
              data-testid="externalRepoUrlInput"
              type="text"
              :required="true"
              :disabled="props.isProjectLocked"
              :error-message="zodSchema.error?.formErrors?.fieldErrors?.externalRepoUrl?.[0]"
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
                :disabled="props.isProjectLocked"
                label="Nom d'utilisateur"
                label-visible
                hint="Nom de l'utilisateur propriétaire du token"
                placeholder="this-is-tobi"
                class="fr-mb-2w"
                :error-message="zodSchema.error?.formErrors?.fieldErrors?.externalUserName?.[0]"
                @update:model-value="updateRepo('externalUserName', $event)"
              />
            </div>
            <div class="fr-mb-2w">
              <DsfrInputGroup
                v-model="localRepo.externalToken"
                data-testid="externalTokenInput"
                type="text"
                :disabled="props.isProjectLocked"
                label="Token d'accès au dépôt Git externe"
                label-visible
                hint="Token d'accès permettant le clone du dépôt par la chaîne DevSecOps"
                placeholder="hoqjC1vXtABzytBIWBXsdyzubmqMYkgA"
                class="fr-mb-2w"
                :error-message="zodSchema.error?.formErrors?.fieldErrors?.externalToken?.[0]"
                @update:model-value="updateRepo('externalToken', $event)"
              />
            </div>
          </div>
        </div>
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
