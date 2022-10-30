<script setup>
import { computed, ref } from 'vue'
import { noSpace } from '@/utils/regex.js'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'

const projectStore = useProjectStore()
const userStore = useUserStore()

const owner = computed(() => userStore.userProfile)

/**
 * Defines a project
 *
 * @typedef {Object} project
 * @property {string} orgname
 * @property {string} projectName
 * @property {Object[]} [repo]
 * @property {(string|undefined)} repo[].gitName
 * @property {(string|undefined)} [repo[].gitSourceName]
 * @property {(string|undefined)} [repo[].userName]
 * @property {(boolean|undefined)} [repo[].isPrivate]
 * @property {(string|undefined)} [repo[].gitToken]
 */
const project = ref({
  orgName: undefined,
  projectName: undefined,
  repo: [],
})

const orgOptions = ref([
  {
    text: 'Ministère de l\'Intérieur',
    value: 'ministere-interieur',
  },
  {
    text: 'Ministère de la Justice',
    value: 'ministere-justice',
  },
  {
    text: 'Direction Interministérielle du Numérique',
    value: 'dinum',
  },
])

/**
 * @returns {boolean}
 */
const isProjectNameValid = computed(() => {
  return noSpace.test(project.value.projectName)
})

/**
 * @returns {boolean}
 */
const isRepoValid = computed(() => {
  if (!project.value.repo.length) return true
  return project.value.repo.every(repo => {
    if (repo.isPrivate) {
      return repo.gitName &&
        noSpace.test(repo.gitName) &&
        repo.gitSourceName &&
        repo.userName &&
        repo.gitToken
    }
    if (repo.gitSourceName || repo.userName) {
      return repo.gitName &&
        noSpace.test(repo.gitName) &&
        repo.gitSourceName &&
        repo.userName
    }
    return repo.gitName && noSpace.test(repo.gitName)
  })
})

/**
 * @returns {boolean}
 */
const isFormValid = computed(() => {
  return project.value.orgName &&
    project.value.projectName &&
    isProjectNameValid.value &&
    isRepoValid.value
})

const addRepo = () => {
  project.value.repo.push({})
}

/**
 * @param {number} index
 * @param {string} key
 * @param {*} value
 */
const updateRepo = (index, key, value) => {
  project.value.repo[index][key] = value
}

/**
 * @param {number} index
 */
const delRepo = (index) => {
  project.value.repo.splice(index, 1)
}

const orderProject = () => {
  projectStore.orderProject(project.value)
}
// TODO : gérer l'après requête create

</script>

<template>
  <h1>Commander un espace projet</h1>
  <DsfrFieldset
    legend="Coordonnées"
    hint="Tous les champs sont requis"
  >
    <DsfrAlert
      type="info"
      :description="`L'adresse e-mail associée au projet sera : ${owner.email}`"
      small
      class="fr-mb-2w"
    />
    <DsfrSelect
      v-model="project.orgName"
      data-testid="orgNameSelect"
      required
      label="Nom de l'organisation"
      label-visible
      :options="orgOptions"
    />
    <DsfrInput
      v-model="project.projectName"
      data-testid="projectNameInput"
      type="text"
      required="required"
      :is-invalid="project.projectName ? !isProjectNameValid : false"
      label="Nom du projet"
      label-visible
      hint="Nom du projet dans l'offre Cloud PI Native. Ne doit pas contenir d'espace"
      placeholder="Candilib"
      class="fr-mb-2w"
    />
  </DsfrFieldset>
  <div
    v-if="project.repo.length"
    class="fr-mt-4w"
  >
    <DsfrFieldset
      v-for="(repo, index) in project.repo"
      :key="`project-${index}`"
      :data-testid="`repoFieldset-${index}`"
      :legend="project.repo.length === 1 ? 'Dépôt Git' : `Dépôt Git ${index + 1}`"
    >
      <DsfrInput
        v-model="repo.gitName"
        :data-testid="`gitNameInput-${index}`"
        type="text"
        required="required"
        :is-invalid="repo.gitName ? !noSpace.test(repo.gitName) : false"
        label="Nom du dépôt Git"
        label-visible
        hint="Nom du dépôt Git créé dans le Gitlab interne"
        placeholder="Candilib"
        class="fr-mb-2w"
        @update:model-value="updateRepo(index, 'gitName', $event)"
      />
      <DsfrInput
        v-model="repo.gitSourceName"
        :data-testid="`gitSrcNameInput-${index}`"
        type="text"
        :required="repo.userName || repo.gitToken || repo.isPrivate ? 'required': false"
        label="Nom du dépôt Git source"
        label-visible
        hint="Nom du dépôt Git qui servira de source pour la synchronisation"
        placeholder="CandilibV2"
        class="fr-mb-2w"
        @update:model-value="updateRepo(index, 'gitSourceName', $event)"
      />
      <DsfrInput
        v-model="repo.userName"
        :data-testid="`userNameInput-${index}`"
        type="text"
        :required="repo.gitSourceName ? 'required' : false"
        autocomplete="name"
        label="Responsable"
        label-visible
        hint="Nom de l'utilisateur / organisation propriétaire du dépôt Git source"
        placeholder="LAB-MI"
        class="fr-mb-2w"
        @update:model-value="updateRepo(index, 'userName', $event)"
      />
      <DsfrCheckbox
        v-model="repo.isPrivate"
        :data-testid="`privateRepoCbx-${index}`"
        label="Dépôt source privé"
        hint="Cochez la case si le dépôt Git source est privé"
        name="isGitSourcePrivate"
        @update:model-value="updateRepo(index, 'isPrivate', $event)"
      />
      <DsfrInput
        v-model="repo.gitToken"
        :data-testid="`gitTokenInput-${index}`"
        type="text"
        :required="repo.isPrivate ? 'required' : false"
        label="Token d'accès au Git source"
        label-visible
        hint="Token d'accès permettant le clone du dépôt par la chaîne DSO"
        placeholder="hoqjC1vXtABzytBIWBXsdyzubmqMYkgA"
        class="fr-mb-2w"
        @update:model-value="updateRepo(index, 'gitToken', $event)"
      />
      <DsfrButton
        label="Retirer le dépôt"
        :data-testid="`delRepoBtn-${index}`"
        tertiary
        icon="ri-delete-bin-7-line"
        class="fr-mb-2w"
        @click="delRepo(index)"
      />
    </DsfrFieldset>
  </div>
  <DsfrButton
    label="Déposer un projet Git"
    data-testid="addRepoBtn"
    secondary
    icon="ri-upload-cloud-line"
    @click="addRepo()"
  />
  <DsfrButton
    label="Commander mon espace projet"
    data-testid="orderProjectBtn"
    primary
    :disabled="!isFormValid"
    icon="ri-send-plane-line"
    class="fr-ml-2w"
    @click="orderProject()"
  />
</template>
