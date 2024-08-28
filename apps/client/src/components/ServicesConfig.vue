<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { PermissionTarget, PluginsUpdateBody, ProjectService } from '@cpn-console/shared'

const props = withDefaults(defineProps<{
  services: ProjectService[]
  permissionTarget: PermissionTarget
  displayGlobal: boolean
}>(), {
  services: undefined,
  displayGlobal: true,
})

const emit = defineEmits<{
  update: [value: PluginsUpdateBody]
  reload: []
}>()

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

const servicesUnwrapped = ref<Record<string, boolean>>({})

function swapWrap(serviceName: string) {
  if (servicesUnwrapped.value[serviceName]) delete servicesUnwrapped.value[serviceName]
  else servicesUnwrapped.value[serviceName] = true
}

const services = computed(() => refTheValues(props.services)
  .map(service => ({
    ...service,
    wrapable: !!(service.urls.length > 2 || service.manifest.global?.length || service.manifest.project?.length),
  }))
  .sort((a, b) => {
    if (a.urls.length && b.urls.length) { // si les deux services ont des urls les trier par titre
      return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
    }
    // si un des deux n'as pas d'urls il doit être affiché à la fin
    return b.urls.length - a.urls.length
  }))

function save() {
  emit('update', updated.value)
  updated.value = {}
}
function reload() {
  emit('reload')
}
</script>

<template>
  <div
    v-if="!services.length"
    class="p-10 flex justify-center italic"
  >
    Aucun service disponible
  </div>
  <div
    v-for="service in services"
    :key="service.title"
    class="mb-5"
    :data-testid="`service-${service.name}`"
  >
    <div
      class="flex flex-row"
    >
      <div
        class="flex-grow flex  border-solid border-0 border-b-2 border-blue-900"
      >
        <button
          class="shrink flex grid-flow-col align-items items-center p-1 w-full"
          data-testid="dropdown-button"
          @click="swapWrap(service.name)"
        >
          <img
            v-if="service.imgSrc"
            :src="service.imgSrc"
            class="inline x-4 shrink"
            width="48"
            height="48"
          >
          <h2
            class="inline mb-0 ml-4"
          >
            {{ service.title }}
          </h2>
          <v-icon
            v-if="service.wrapable"
            :class="`shrink ml-4 ${servicesUnwrapped[service.name] ? 'rotate-90' : ''}`"
            name="ri-arrow-right-s-line"
          />
        </button>
      </div>
      <a
        v-for="url in service.urls.slice(0, 2)"
        :key="url.to"
        :href="url.to"
        target="_blank"
        class="inline m-0 self-stretch flex"
      >
        <DsfrButton
          :label="url.name"
          :title="url.to"
          :icon="url.name ? '' : 'ri-external-link-line'"
          :icon-only="!url.name"
        />
      </a>
      <DsfrButton
        v-if="service.urls.length > 2"
        label="+"
        primary
        class="inline m-0 self-stretch hidden"
        @click="swapWrap(service.name)"
      />
    </div>
    <div
      v-if="service.wrapable"
      :class="`p-5 ${servicesUnwrapped[service.name] ? 'block' : 'hidden'}`"
      data-testid="additional-config"
    >
      <div
        v-if="service.urls.length > 2"
        class="flex flex-row flex-wrap gap-0.5 mb-2"
      >
        <a
          v-for="url in service.urls"
          :key="url.to"
          :href="url.to"
          target="_blank"
          class="inline m-0 self-stretch flex"
        >
          <DsfrButton
            :title="url.to"
            :label="url.name"
            :icon="url.name ? '' : 'ri-external-link-line'"
            :icon-only="!url.name"
          />
        </a>
      </div>
      <p
        v-if="service.description"
      >
        {{ service.description }}
      </p>
      <div
        class="w-full grid gap-2"
      >
        <div
          v-if="service.manifest.project?.length"
          class="border-b-solid border-stone-600 text-xl col-span-2"
        >
          Configuration projet
        </div>
        <ConfigParam
          v-for="item in service.manifest.project"
          :key="item.key"
          :options="{
            value: item.value,
            kind: item.kind,
            description: item.description,
            name: item.title,
            // @ts-ignore Sisi il y a potentiellement un placeholder
            placeholder: item.placeholder || '',
            disabled: !item.permissions[permissionTarget].write,
          }"
          @update="(value: string) => update({ key: item.key, value, plugin: service.name })"
        />
        <div
          v-if="service.manifest.global?.length && props.displayGlobal"
          class="border-b-solid border-stone-600 text-xl col-span-2"
        >
          Configuration global
        </div>
        <ConfigParam
          v-for="item in props.displayGlobal ? service.manifest.global : []"
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
    </div>
  </div>
  <div
    class="flex justify-end gap-10"
  >
    <DsfrButton
      v-if="Object.values(updated).keys() && Object.values(updated).map(v => Object.keys(v)).flat().length"
      label="Enregister"
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

<style scoped>
a[target="_blank"]::after {
  display: none;
}
</style>
