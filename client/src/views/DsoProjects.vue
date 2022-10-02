<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// TODO : récupérer dynamiquement la liste des projets
const projectList = ref([{
  text: 'Candilib',
  value: 'candilib-id',
},
])

const goToOrderProject = () => {
  router.push('/order-project')
}

</script>

<template>
  <div
    class="flex items-center justify-between"
  >
    <DsfrSelect
      label="Projet à visualiser"
      :options="projectList"
    />
    <DsfrButton
      label="Créer un nouveau projet"
      tertiary
      class="fr-mt-2v"
      icon="ri-add-line"
      @click="goToOrderProject()"
    />
  </div>
  <router-view />
</template>
