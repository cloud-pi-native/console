<script setup lang="ts">
import { localeParseFloat } from '@/utils/func.js'
import type { ProjectV2 } from '@cpn-console/shared'

type ProjectSettings = Pick<ProjectV2, 'limitless' | 'hprodMemory' | 'hprodCpu' | 'hprodGpu' | 'prodMemory' | 'prodCpu' | 'prodGpu'>
const props = defineProps<{
  project: ProjectSettings
}>()

const localProject = ref<ProjectSettings>(props.project)

onMounted(async () => {
})

function toggleLimitless(e: boolean) {
  if (e) {
    localProject.value.hprodMemory = 0
    localProject.value.hprodCpu = 0
    localProject.value.hprodGpu = 0
    localProject.value.prodMemory = 0
    localProject.value.prodCpu = 0
    localProject.value.prodGpu = 0
  }
}
</script>

<template>
  <h3>Configuration du projet</h3>
  <div
    class="flex flex-wrap gap-10"
  >
    <DsfrFieldset>
      <DsfrToggleSwitch
        v-model="localProject.limitless"
        data-testid="limitlessProjectSwitch"
        label="Déploiement sans limite de capacité"
        hint="Indiquer si le projet doit respecter des limites de consommation de ressources ou non. Attention, en l'absence de limite le déploiement n'est pas garanti."
        name="limitlessProjectSwitch"
        class="mt-5"
        no-text
        :border-bottom="true"
        @update:model-value="(e: boolean) => toggleLimitless(e)"
      />
    </DsfrFieldset>
    <DsfrFieldset
      v-if="!localProject.limitless"
      legend="Ressources Hors Prod du projet"
      hint="Veuillez renseigner les ressources pour le déploiement de tous les Environnements de type Hors Prod de ce projet."
    >
      <div class="fr-container--fluid">
        <div class="fr-grid-row fr-mb-5v">
          <div class="fr-col fr-ml-1v">
            <DsfrInputGroup
              v-model="localProject.hprodMemory"
              label="Mémoire allouée"
              label-visible
              hint="En GiB"
              type="number"
              min="0"
              max="1000"
              step="1"
              :required="true"
              data-testid="memoryHprodInput"
              placeholder="16"
              @update:model-value="(value: string | number | undefined) => localProject.hprodMemory = localeParseFloat(value as string)"
            />
          </div>
          <div class="fr-col fr-ml-10v fr-mr-10v">
            <DsfrInputGroup
              v-model="localProject.hprodCpu"
              label="CPU alloué"
              label-visible
              hint="En entier : 1 équivaut à 1000m, soit 1000 milli-cores, soit un CPU"
              type="number"
              min="0"
              max="1000"
              step="1"
              :required="true"
              data-testid="cpuHprodInput"
              placeholder="8"
              @update:model-value="(value: string | number | undefined) => localProject.hprodCpu = localeParseFloat(value as string)"
            />
          </div>
          <div class="fr-col fr-mr-1v">
            <DsfrInputGroup
              v-model="localProject.hprodGpu"
              class="fr-col"
              label="GPU alloué"
              label-visible
              hint="En entier : 1 équivaut à 1000m, soit 1000 milli-cores, soit un GPU"
              type="number"
              min="0"
              max="100"
              step="1"
              :required="true"
              data-testid="gpuHprodInput"
              placeholder="2"
              @update:model-value="(value: string | number | undefined) => localProject.hprodGpu = localeParseFloat(value as string)"
            />
          </div>
        </div>
      </div>
    </DsfrFieldset>
    <DsfrFieldset
      v-if="!localProject.limitless"
      legend="Ressources Prod du projet"
      hint="Veuillez renseigner les ressources pour le déploiement de tous les Environnements de type Prod de ce projet."
    >
      <div class="fr-container--fluid">
        <div class="fr-grid-row fr-mb-5v">
          <div class="fr-col fr-ml-1v">
            <DsfrInputGroup
              v-model="localProject.prodMemory"
              label="Mémoire allouée"
              label-visible
              hint="En GiB"
              type="number"
              min="0"
              max="1000"
              step="1"
              :required="true"
              data-testid="memoryProdInput"
              placeholder="16"
              @update:model-value="(value: string | number | undefined) => localProject.prodMemory = parseFloat(value as string)"
            />
          </div>
          <div class="fr-col fr-ml-10v fr-mr-10v">
            <DsfrInputGroup
              v-model="localProject.prodCpu"
              label="CPU alloué"
              label-visible
              hint="En entier : 1 équivaut à 1000m, soit 1000 milli-cores, soit un CPU"
              type="number"
              min="0"
              max="1000"
              step="1"
              :required="true"
              data-testid="cpuProdInput"
              placeholder="8"
              @update:model-value="(value: string | number | undefined) => localProject.prodCpu = parseFloat(value as string)"
            />
          </div>
          <div class="fr-col fr-mr-1v">
            <DsfrInputGroup
              v-model="localProject.prodGpu"
              class="fr-col"
              label="GPU alloué"
              label-visible
              hint="En entier : 1 équivaut à 1000m, soit 1000 milli-cores, soit un GPU"
              type="number"
              min="0"
              max="100"
              step="1"
              :required="true"
              data-testid="gpuProdInput"
              placeholder="2"
              @update:model-value="(value: string | number | undefined) => localProject.prodGpu = parseFloat(value as string)"
            />
          </div>
        </div>
      </div>
    </DsfrFieldset>
  </div>
</template>
