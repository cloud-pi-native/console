<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useCIFilesStore } from '@/stores/ciFiles.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps({
  internalRepoName: {
    type: String,
    default: '',
  },
})

const projectStore = useProjectStore()

const ciFilesStore = useCIFilesStore()

const snackbarStore = useSnackbarStore()

const projectName = computed(() => projectStore.selectedProject?.name)
const internalRepoName = ref(props.internalRepoName)

const ciData = ref({
  projectName: projectName.value,
  internalRepoName: '',
  typeLanguage: 'java',
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

const expandedId = ref(undefined)
const generatedCI = ref(undefined)
const files = ref([])

const generateCI = async () => {
  generatedCI.value = await ciFilesStore.generateCIFiles(ciData.value)
  prepareForDownload()
}

const prepareForDownload = () => {
  files.value = Object.keys(generatedCI.value).map((key) => {
    const filename = `.${key}.yml`
    const file = new File([generatedCI.value[key]], filename, {
      type: 'text/plain;charset=utf-8',
    })
    const url = URL.createObjectURL(file)
    window.URL.revokeObjectURL(file)

    return {
      key,
      href: url,
      size: `${file.size} bytes`,
      format: 'YAML',
      title: filename,
    }
  })
}

const copyContent = async (key) => {
  try {
    await navigator.clipboard.writeText(generatedCI.value[key])
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

onMounted(() => {
  ciData.value.internalRepoName = internalRepoName
})

watch(internalRepoName, (internalRepoName) => {
  ciData.value.internalRepoName = internalRepoName
})
</script>

<template>
  <DsfrAccordion
    title="Fichiers de GitLab CI"
    data-testid="gitlabCIAccordion"
    :expanded-id="expandedId"
    @expand="id =>
      expandedId = expandedId === id ?
        undefined :
        id"
  >
    <DsfrFieldset
      legend="Générer des fichiers de GitLab CI pour ce dépôt"
      hint="Renseignez les champs ci-dessous si vous souhaitez générer des fichiers de GitLab CI pour ce dépôt"
      class="fr-mb-2w"
    >
      <DsfrSelect
        v-model="ciData.typeLanguage"
        data-testid="typeLanguageSelect"
        label="Type de l'application"
        :options="typeLanguages"
      />
      <div v-if="ciData.typeLanguage === 'node'">
        <DsfrInput
          v-model="ciData.nodeVersion"
          data-testid="nodeVersionInput"
          label="Version de nodejs"
          label-visible
          placeholder="18.12.1"
          pattern="\d{2}\.\d{2}\.\d{1}"
          title="au format x.x.x"
        />
        <DsfrInput
          v-model="ciData.nodeInstallCommand"
          data-testid="nodeInstallInput"
          label="Commande d'installation des dépendances (npm, yarn...)"
          label-visible
          placeholder="npm install"
        />
        <DsfrInput
          v-model="ciData.nodeBuildCommand"
          data-testid="nodeBuildInput"
          label="Commande de build (npm, yarn...)"
          label-visible
          placeholder="npm build"
        />
      </div>
      <div v-if="ciData.typeLanguage === 'java'">
        <DsfrInput
          v-model="ciData.javaVersion"
          data-testid="javaVersionInput"
          label="Version du jdk"
          label-visible
          placeholder="19.1.1"
          pattern="\d{2}\.\d{2}\.\d{1}"
          title="au format x.x.x"
        />
        <DsfrInput
          v-model="ciData.artefactDir"
          data-testid="artefactDirInput"
          label="Chemin relatif de l'artefact de l'application"
          label-visible
          placeholder="./**/*.jar"
        />
      </div>
      <DsfrInput
        v-model="ciData.workingDir"
        data-testid="workingDirInput"
        label="Chemin relatif de construction de l'application"
        hint="dossier contenant le fichier package.json ou pom.xml"
        label-visible
        placeholder="./"
      />
    </DsfrFieldset>

    <DsfrButton
      label="Générer les fichiers de CI"
      data-testid="generateCIBtn"
      secondary
      icon="ri-file-settings-line"
      class="fr-mb-2w"
      @click="generateCI()"
    />

    <div
      v-if="generatedCI"
      data-testid="generatedCI"
    >
      <div
        class="fr-downloads-group fr-downloads-group--bordered"
      >
        <p class="fr-hint-text">
          Copiez le contenu des fichiers générés en cliquant sur l'icône ou bien téléchargez-les via les liens ci-dessous.
        </p>
        <ul>
          <li
            v-for="file in files"
            :key="file.key"
            class="flex justify-between w-max fr-mb-2w"
          >
            <DsfrFileDownload
              :format="file.format"
              :size="file.size"
              :href="file.href"
              :title="file.title"
            />
            <DsfrButton
              secondary
              icon-only
              icon="ri-file-copy-2-line"
              :data-testid="`copy-${file.key}-ContentBtn`"
              class="fr-ml-2w fr-mb-2w"
              :title="`Copier le contenu du fichier ${file.title}`"
              @click="copyContent(file.key)"
            />
          </li>
        </ul>
      </div>
    </div>
  </DsfrAccordion>
</template>
