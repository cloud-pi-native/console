<script lang="ts" setup>
import { ref } from 'vue'
import type { PluginConfigItem, PluginSchema } from '@cpn-console/shared'
import { usePluginsConfigStore } from '@/stores/plugins'
import { useSnackbarStore } from '@/stores/snackbar'

const pluginsStore = usePluginsConfigStore()
const snackbarStore = useSnackbarStore()

const updated = ref<Record<string, Record<string, string>>>({})

function getItemsToShowLength(items: (PluginConfigItem & { value: any })[] | undefined): number | undefined {
  return items?.filter(item => item.permissions.admin.read || item.permissions.admin.write).length
}

function refTheValues(services: PluginSchema[]) {
  return services.map((service) => {
    return {
      ...service,
      manifest: service.manifest?.map(item => ({ ...item, value: ref(item.value) })),
      wrapable: !!((getItemsToShowLength(service.manifest))),
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

onBeforeMount(() => {
  reload()
})

function update(data: { value: string, key: string, plugin: string }) {
  if (!updated.value[data.plugin]) updated.value[data.plugin] = {}
  updated.value[data.plugin][data.key] = data.value
}

const servicesWrapableLength = computed(() => services.value.filter(({ wrapable }) => wrapable).length)
const activeAccordion = ref<number>()
</script>

<template>
  <div
    v-if="!services.length"
    id="servicesTable"
    class="p-10 flex justify-center italic"
  >
    Aucun service disponible
  </div>
  <template
    v-if="servicesWrapableLength"
  >
    <h3>Configuration des plugins</h3>
    <DsfrAccordionsGroup
      v-model="activeAccordion"
      class="mb-10"
    >
      <template
        v-for="service in services"
        :key="service.name"
      >
        <template
          v-if="service.wrapable"
        >
          <DsfrAccordion
            :id="service.name"
            :title="service.title || service.name"
          >
            <p
              v-if="service.description"
            >
              {{ service.description }}
            </p>
            <div>
              <DsfrCallout
                v-if="service.manifest.length"
                title="Configuration globale"
                class="flex flex-col gap-2"
              >
                <ConfigParam
                  v-for="item in service.manifest"
                  :key="item.key"
                  :options="{
                    value: ref(item.value),
                    kind: item.kind,
                    description: item.description,
                    name: item.title,
                    // @ts-ignore si si il y a potentiellement un placeholder
                    placeholder: item.placeholder || '',
                    disabled: !item.permissions.admin.write,
                  }"
                  @update="(value: string) => update({ key: item.key, value, plugin: service.name })"
                />
              </DsfrCallout>
            </div>
          </DsfrAccordion>
        </template>
      </template>
    </DsfrAccordionsGroup>
    <div
      class="flex justify-end gap-10"
    >
      <DsfrButton
        v-if="Object.values(updated).keys() && Object.values(updated).map(v => Object.keys(v)).flat().length"
        label="Enregistrer"
        data-testid="saveBtn"
        @click="save()"
      />
      <DsfrButton
        label="Recharger"
        secondary
        data-testid="reloadBtn"
        @click="reload()"
      />
    </div>
  </template>
</template>
