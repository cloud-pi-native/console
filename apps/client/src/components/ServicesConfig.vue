<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { PermissionTarget, PluginConfigItem, PluginsUpdateBody, ProjectService } from '@cpn-console/shared'
import type { Project } from '@/utils/project-utils.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = withDefaults(defineProps<{
  project: Project
  permissionTarget: PermissionTarget
  disabled: boolean
  displayGlobal: boolean
}>(), {
  displayGlobal: true,
  disabled: false,
})

const snackbarStore = useSnackbarStore()
const services = ref<ProjectService[]>([])

interface ManifestGrouped {
  length: number
  sectionNumber: number
  items: {
    default: PluginConfigItem[]
    [x: string]: PluginConfigItem[]
  }
}
function groupManifest(configItems: PluginConfigItem[] = []) {
  return configItems.reduce((acc, curr) => {
    if (!curr.section) curr.section = 'default'
    if (curr.section in acc.items) {
      acc.items[curr.section].push(curr)
    } else {
      acc.items[curr.section] = [curr]
      acc.sectionNumber++
    }
    return acc
  }, { length: configItems.length, items: { default: [] }, sectionNumber: 1 } as ManifestGrouped)
}

function refTheValues(services: ProjectService[]) {
  return services.map((service) => {
    return {
      ...service,
      manifest: {
        project: service.manifest.project?.map(item => ({ ...item, value: ref(item.value) })),
        global: service.manifest.global?.map(item => ({ ...item, value: ref(item.value) })),
      },
    }
  })
}

const updated = ref<PluginsUpdateBody>({})

function update(data: { value: string, key: string, plugin: string }) {
  if (!updated.value[data.plugin]) updated.value[data.plugin] = {}
  updated.value[data.plugin][data.key] = data.value
}

function getItemsToShowLength(items: PluginConfigItem[] | (PluginConfigItem & { value: any })[] | undefined, scope: PermissionTarget): number | undefined {
  return items?.filter(item => item.permissions[scope].read || item.permissions[scope].write).length
}

const servicesWithRef = computed(() => refTheValues(services.value)
  .map(service => ({
    ...service,
    wrapable: !!((props.displayGlobal && getItemsToShowLength(service.manifest.global, props.permissionTarget)) || getItemsToShowLength(service.manifest.project, props.permissionTarget)),
  }))
  .sort((a, b) => {
    if (a.urls.length && b.urls.length) { // si les deux services ont des urls les trier par titre
      return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
    }
    // si un des deux n'as pas d'urls il doit être affiché à la fin
    return b.urls.length - a.urls.length
  }))

const servicesWrapableLength = computed(() => servicesWithRef.value.filter(({ wrapable }) => wrapable).length)

async function save() {
  try {
    await props.project.Services.update(updated.value)
    snackbarStore.setMessage('Paramètres sauvegardés', 'success')
  } catch (_error) {
    snackbarStore.setMessage('Erreur lors de la sauvegarde', 'error')
  }
  await reload()
  updated.value = {}
}
async function reload() {
  const resServices = await props.project.Services.list(props.permissionTarget)
  services.value = []
  await nextTick()
  services.value = resServices
}

onMounted(async () => await reload())
const activeAccordion = ref<number>()
</script>

<template>
  <div class="flex flex-col">
    <div
      v-if="!servicesWithRef.length"
      id="servicesTable"
      class="p-10 flex justify-center italic"
    >
      Aucun service disponible
    </div>
    <h3
      v-else
      id="servicesTable"
    >
      Services externes
    </h3>

    <div
      data-testid="services-urls"
      class="flex flex-row flex-wrap gap-5 items-stretch justify-start gap-8 w-full mb-10"
    >
      <template
        v-for="service in servicesWithRef"
        :key="service.name"
      >
        <DsfrTile
          v-for="url in service.urls"
          :key="url.name"
          class="flex-basis-60 flex-grow max-w-50"
          :title=" url.name || service.title || service.name"
          :img-src="service.imgSrc"
          :description="service.description"
          :icon="false"
          :to="url.to"
          shadow
        />
      </template>
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
          v-for="service in servicesWithRef"
          :key="service.name"
        >
          <template
            v-if="service.wrapable"
          >
            <DsfrAccordion
              :id="service.name"
              :data-testid="`service-config-${service.name}`"
              :title="service.title || service.name"
            >
              <div
                :class="getItemsToShowLength(service.manifest.project, permissionTarget) && (props.displayGlobal && getItemsToShowLength(service.manifest.global, permissionTarget)) ? '2xl:grid 2xl:grid-cols-2 2xl:gap-10' : ''"
              >
                <DsfrCallout
                  v-if="getItemsToShowLength(service.manifest.project, permissionTarget)"
                  title="Configuration projet"
                  class="flex flex-col gap-2 h-min"
                  :data-testid="`service-project-config-${service.name}`"
                >
                  <template
                    v-for="[title, items] in Object.entries(groupManifest(service.manifest.project).items)"
                    :key="title"
                  >
                    <template v-if="items.length">
                      <div
                        :class="title === 'default' ? 'flex-end' : ''"
                      >
                        <h6 v-if="title !== 'default'">
                          {{ title }}
                        </h6>
                        <ConfigParam
                          v-for="item in items"
                          :key="item.key"
                          :options="{
                            value: ref(item.value),
                            kind: item.kind,
                            description: item.description,
                            name: item.title,
                            // @ts-ignore Sisi il y a potentiellement un placeholder
                            placeholder: item.placeholder || '',
                            disabled: !item.permissions[permissionTarget].write || props.disabled,
                          }"
                          @update="(value: string) => update({ key: item.key, value, plugin: service.name })"
                        />
                      </div>
                    </template>
                  </template>
                </DsfrCallout>
                <DsfrCallout
                  v-if="service.manifest.global?.length && props.displayGlobal"
                  title="Configuration globale"
                  class="flex flex-col gap-2 h-min"
                  :data-testid="`service-global-config-${service.name}`"
                >
                  <template
                    v-for="[title, items] in Object.entries(groupManifest(service.manifest.global).items)"
                    :key="title"
                  >
                    <template v-if="items.length">
                      <div
                        :class="`flex flex-col gap-2 ${title === 'default' ? 'order-first' : ''}`"
                      >
                        <h6 v-if="title !== 'default'">
                          {{ title }}
                        </h6>
                        <hr v-else>
                        <ConfigParam
                          v-for="item in items"
                          :key="item.key"
                          :options="{
                            value: ref(item.value),
                            kind: item.kind,
                            description: item.description,
                            name: item.title,
                            // @ts-ignore si si il y a potentiellement un placeholder
                            placeholder: item.placeholder || '',
                            disabled: !item.permissions[permissionTarget].write,
                          }"
                          @update="(value: string) => update({ key: item.key, value, plugin: service.name })"
                        />
                      </div>
                    </template>
                  </template>
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
  </div>
</template>

<style>
.fr-tile__title [target="_blank"]::after {
  display: none;
}

.fr-grid-row .fr-tile {
  height: inherit
}

.fr-tile__pictogram > img {
  width: inherit;
}
</style>
