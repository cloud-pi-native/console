<script setup>
import { computed, ref } from 'vue'

const project = ref({
  email: undefined,
  orgName: undefined,
  projectName: undefined,
  repo: [],
})

const isRepoValid = computed(() => {
  // TODO : itérer pour chaque repo
  // forEach(project.value.repo)
  // gitName &&
  // if gitSourceName, managerName &&
  // if isGitSourcePrivate, gitToken
  return true
})

const isFormValid = computed(() => {
  return project.value.email &&
      project.value.orgName &&
      project.value.projectName &&
      isRepoValid
})

const addRepo = () => {
  project.value.repo.push({})
}

const updateRepo = (index, key, value) => {
  project.value.repo[index][key] = value
}

const orderProject = () => {
  console.log(project.value)
}

</script>

<template>
  <DsfrFieldset
    legend="Commande d'un espace projet"
  >
    <DsfrInput
      v-model="project.email"
      type="email"
      required="required"
      autocomplete="email"
      label="E-mail professionnel"
      label-visible
      placeholder="prenom.nom@interieur.gouv.fr"
      class="fr-mb-2w"
    />
    <DsfrInput
      v-model="project.orgName"
      type="text"
      required="required"
      autocomplete="organization"
      label="Nom de l'organisation"
      label-visible
      placeholder="SDIT"
      class="fr-mb-2w"
    />
    <DsfrInput
      v-model="project.projectName"
      type="text"
      required="required"
      label="Nom du projet"
      label-visible
      placeholder="MonProjet"
      class="fr-mb-2w"
    />
  </DsfrFieldset>
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
        type="text"
        required="required"
        label="Nom du dépôt git"
        label-visible
        placeholder="dso-console"
        class="fr-mb-2w"
        @update:model-value="updateRepo(index, 'gitName', $event)"
      />
      <DsfrInput
        type="text"
        label="Nom du dépôt git source"
        label-visible
        placeholder="dso-console"
        class="fr-mb-2w"
        @update:model-value="updateRepo(index, 'gitSourceName', $event)"
      />
      <DsfrInput
        type="text"
        :required="repo.gitSourceName ? 'required' : false"
        autocomplete="name"
        label="Nom du responsable"
        label-visible
        hint="Nom de l'organisation ou de l'utilisateur propriétaire du dépôt git source"
        class="fr-mb-2w"
        @update:model-value="updateRepo(index, 'managerName', $event)"
      />
      <DsfrInput
        v-model="gitToken"
        type="text"
        label="Token d'accès git"
        label-visible
        placeholder="ghp_exemple"
        class="fr-mb-2w"
        @update:model-value="updateRepo(index, 'gitToken', $event)"
      />
    </DsfrFieldset>
  </div>
</template>
