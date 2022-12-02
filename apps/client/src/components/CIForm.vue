<script setup>
import { ref, watch, toRaw } from 'vue'
import { useProjectStore } from '@/stores/project.js'

const projectStore = useProjectStore()

const props = defineProps({
  internalRepoName: {
    type: String,
    default: '',
  },
})

const ciData = ref({
  orgName: projectStore.selectedProject.orgName,
  projectName: props.internalRepoName,
  typeLanguage: '',
  nodeVersion: '',
  nodeInstallCommand: '',
  nodeBuildCommand: '',
  workingDir: '',
  javaVersion: '',
  artefactDir: '',
})

const typeLanguages = ref([
  {
    text: 'Java',
    value: 'java',
  },
  {
    text: 'Node.js',
    value: 'node',
  },
  {
    text: 'Python',
    value: 'python',
  },
])

watch(props, (props) => {
  ciData.value.projectName = toRaw(props).internalRepoName
})
</script>

<template>
  <DsfrFieldset
    legend="Création d'un fichier de GitLab CI"
    hint="Renseignez les champs ci-dessous si vous souhaitez générer un fichier de GitLab CI pour ce dépôt"
    class="fr-mb-2w"
  >
    <DsfrSelect
      v-model="ciData.typeLanguage"
      label="Type de l'application"
      :options="typeLanguages"
    />
    <div v-if="ciData.typeLanguage === 'node'">
      <DsfrInput
        v-model="ciData.nodeVersion"
        label="Version de nodejs"
        label-visible
        placeholder="18.12.1"
        pattern="\d{2}\.\d{2}\.\d{1}"
      />
      <!-- TODO : pattern ne fonctionne pas ? -->
      <DsfrInput
        v-model="ciData.nodeInstallCommand"
        label="Commande d'installation des dépendances (npm, yarn...)"
        label-visible
        placeholder="npm install"
      />
      <DsfrInput
        v-model="ciData.nodeBuildCommand"
        label="Commande de build (npm, yarn...)"
        label-visible
        placeholder="npm build"
      />
    </div>
    <div v-if="ciData.language === 'java'">
      <DsfrInput
        v-model="ciData.javaVersion"
        label="Version du jdk"
        label-visible
        placeholder="19.1.1"
        pattern="\d{2}\.\d{2}\.\d{1}"
      />
    </div>
    <DsfrInput
      v-model="workingDir"
      label="Chemin relatif de construction de l'application (contenant le fichier package.json ou pom.xml)"
      label-visible
      placeholder="./client/package.json"
    />
    <DsfrInput
      v-model="artefactDir"
      label="Chemin relatif de l'artefact de l'application"
      label-visible
      placeholder="./**/*.jar"
    />
  </DsfrFieldset>
  <!-- TODO : afficher fichier ci généré -->
  <code>
    {{ ciData }}
  </code>
</template>
