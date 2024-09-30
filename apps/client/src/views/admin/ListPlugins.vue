<script lang="ts" setup>
import { ref } from 'vue'
import type { PluginSchema } from '@cpn-console/shared'
import { usePluginsConfigStore } from '@/stores/plugins.js'
import { useSnackbarStore } from '@/stores/snackbar'

const pluginsStore = usePluginsConfigStore()
const snackbarStore = useSnackbarStore()

const updated = ref<Record<string, Record<string, string>>>({})

function refTheValues(services: PluginSchema[]) {
  return services.map((service) => {
    return {
      ...service,
      manifest: service.manifest?.map(item => ({ ...item, value: ref(item.value) })),
    }
  })
}

const services: Ref<ReturnType<typeof refTheValues>> = ref([])

async function reload() {
  const resServices = await pluginsStore.getPluginsConfig()
  services.value = []
  await nextTick()

  services.value = refTheValues(resServices)

  updated.value = {}
}

async function save() {
  snackbarStore.isWaitingForResponse = true
  try {
    await pluginsStore.updatePluginsConfig(updated.value)
    snackbarStore.setMessage('Paramètres sauvegardés', 'success')
  } catch (error) {
    console.log(error)
    snackbarStore.setMessage('Erreur lors de la sauvegarde', 'error')
  }
  await reload()
  snackbarStore.isWaitingForResponse = false
}

const servicesUnwrapped = ref<Record<string, boolean>>({})
function swapWrap(serviceName: string) {
  if (servicesUnwrapped.value[serviceName]) delete servicesUnwrapped.value[serviceName]
  else servicesUnwrapped.value[serviceName] = true
}

onBeforeMount(() => {
  reload()
})

function update(data: { value: string, key: string, plugin: string }) {
  if (!updated.value[data.plugin]) updated.value[data.plugin] = {}
  updated.value[data.plugin][data.key] = data.value
}
</script>

<template>
  <h1>Configuration des plugins</h1>
  <div
    v-if="!services.length"
    class="p-10 flex justify-center italic"
  >
    Aucun plugin à afficher
  </div>
  <div
    v-for="service in services"
    :key="service.title"
    class="mb-5"
  >
    <div
      class="flex flex-col"
    >
      <div
        class="flex-grow flex  border-solid border-0 border-b-2 border-blue-900"
      >
        <button
          class="shrink flex grid-flow-col align-items items-center p-1"
          style="width: 100%;"
          @click="swapWrap(service.name)"
        >
          <img
            v-if="service.imgSrc"
            :src="service.imgSrc"
            alt=""
            class="inline x-4 shrink"
            width="48"
            height="48"
          >
          <v-icon
            :class="`shrink ml-4 ${servicesUnwrapped[service.name] ? 'rotate-90' : ''}`"
            name="ri:arrow-right-s-line"
          />
          <h2
            class="inline mb-0 ml-4"
          >
            {{ service.title }}
          </h2>
        </button>
      </div>
      <div
        :class="`p-5 ${servicesUnwrapped[service.name] ? 'block' : 'hidden'}`"
      >
        <p
          v-if="service.description"
        >
          {{ service.description }}
        </p>
        <div
          class="w-full grid gap-2"
        >
          <ConfigParam
            v-for="item in service.manifest"
            :key="item.key"
            :options="{
              value: item.value,
              kind: item.kind,
              description: item.description,
              name: item.title,
              // @ts-ignore si si il y a un placeholder
              placeholder: item.placeholder || '',
              disabled: !item.permissions.admin.write,
            }"
            @update="(value: string) => update({ key: item.key, value, plugin: service.name })"
          />
        </div>
      </div>
    </div>
  </div>
  <div
    class="flex justify-end gap-10"
  >
    <DsfrButton
      v-if="Object.values(updated).keys() && Object.values(updated).map(v => Object.keys(v)).flat().length"
      label="Enregistrer"
      @click="save()"
    />
    <DsfrButton
      label="Recharger"
      secondary
      @click="reload()"
    />
  </div>
</template>
