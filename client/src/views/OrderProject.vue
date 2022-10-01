<script setup>
import { computed, ref } from 'vue'
import { noSpace, email } from '@/utils/regex.js'

const project = ref({
  email: undefined,
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

const isEmailValid = computed(() => {
  return email.test(project.value.email)
})

const isProjectNameValid = computed(() => {
  return noSpace.test(project.value.projectName)
})

const isRepoValid = computed(() => {
  if (!project.value.repo.length) return true
  return project.value.repo.every(repo => {
    if (repo.isPrivate) {
      return repo.gitName &&
        noSpace.test(repo.gitName) &&
        repo.gitSourceName &&
        repo.managerName &&
        repo.gitToken
    }
    if (repo.gitSourceName || repo.managerName) {
      return repo.gitName &&
        noSpace.test(repo.gitName) &&
        repo.gitSourceName &&
        repo.managerName
    }
    return repo.gitName && noSpace.test(repo.gitName)
  })
})

const isFormValid = computed(() => {
  return isEmailValid.value &&
    project.value.orgName &&
    project.value.projectName &&
    isProjectNameValid.value &&
    isRepoValid.value
})

const addRepo = () => {
  project.value.repo.push({})
}

const updateRepo = (index, key, value) => {
  project.value.repo[index][key] = value
}

const delRepo = (index) => {
  project.value.repo.splice(index, 1)
}

const orderProject = () => {
  // TODO
  console.log(project.value)
}

</script>

<template>
  <h1>Commander un espace projet</h1>
  <DsfrFieldset
    legend="Coordonnées"
    hint="Tous les champs sont requis"
  >
    <DsfrInput
      v-model="project.email"
      type="email"
      required="required"
      autocomplete="email"
      :is-invalid="project.email ? !isEmailValid : false"
      label="E-mail professionnel"
      label-visible
      placeholder="prenom.nom@interieur.gouv.fr"
      class="fr-mb-2w"
    />
    <DsfrSelect
      v-model="project.orgName"
      required
      label="Nom de l'organisation"
      label-visible
      :options="orgOptions"
    />
    <DsfrInput
      v-model="project.projectName"
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
      :legend="project.repo.length === 1 ? 'Dépôt git' : `Dépôt git ${index + 1}`"
    >
      <DsfrInput
        v-model="repo.gitName"
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
        type="text"
        :required="repo.managerName || repo.gitToken || repo.isPrivate ? 'required': false"
        label="Nom du dépôt Git source"
        label-visible
        hint="Nom du dépôt Git qui servira de source pour la synchronisation"
        placeholder="CandilibV2"
        class="fr-mb-2w"
        @update:model-value="updateRepo(index, 'gitSourceName', $event)"
      />
      <DsfrInput
        v-model="repo.managerName"
        type="text"
        :required="repo.gitSourceName ? 'required' : false"
        autocomplete="name"
        label="Responsable"
        label-visible
        hint="Nom de l'utilisateur / organisation propriétaire du dépôt Git source"
        placeholder="LAB-MI"
        class="fr-mb-2w"
        @update:model-value="updateRepo(index, 'managerName', $event)"
      />
      <DsfrCheckbox
        v-model="repo.isPrivate"
        label="Dépôt source privé"
        hint="Cochez la case si le dépôt Git source est privé"
        name="isGitSourcePrivate"
        @update:model-value="updateRepo(index, 'isPrivate', $event)"
      />
      <DsfrInput
        v-model="repo.gitToken"
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
        tertiary
        icon="ri-delete-bin-7-line"
        class="fr-mb-2w"
        @click="delRepo(index)"
      />
    </DsfrFieldset>
  </div>
  <DsfrButton
    label="Déposer un projet git"
    secondary
    icon="ri-upload-cloud-line"
    @click="addRepo()"
  />
  <DsfrButton
    label="Commander mon espace projet"
    primary
    :disabled="!isFormValid"
    icon="ri-send-plane-line"
    class="fr-ml-2w"
    @click="orderProject()"
  />
</template>
