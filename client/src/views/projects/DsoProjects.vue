<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project.js'

const router = useRouter()
const projectStore = useProjectStore()

// TODO : récupérer dynamiquement la liste des projets
const projectList = ref([{
  text: 'Candilib',
  value: 'candilib-id',
},
])

const selectedProject = ref(projectStore.storeSelectedProject)

const goToOrderProject = () => {
  router.push('/order-project')
}

// TODO : récupérer le projectStore.storeSelectedProject dans chaque children (service, team, dashboard)
watch(selectedProject, () => {
  projectStore.setSelectedProject(selectedProject.value)
})

</script>

<template>
  <div
    class="flex <md:flex-col-reverse items-center justify-between"
  >
    <DsfrSelect
      v-model="selectedProject"
      label="Projet à visualiser"
      :options="projectList"
    />
    <DsfrButton
      label="Créer un nouveau projet"
      tertiary
      class="fr-mt-2v <md:mb-2"
      icon="ri-add-line"
      @click="goToOrderProject()"
    />
  </div>
  <router-view />
</template>
