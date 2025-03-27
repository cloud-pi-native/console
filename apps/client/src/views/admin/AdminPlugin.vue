<script setup lang="ts">
import { usePluginsStore } from '@/stores/plugins.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import type { PluginReport, PluginSchema } from '@cpn-console/shared'
import { ItemCollector } from '@cpn-console/shared'

const props = defineProps<{
  name: string
}>()

const snackbarStore = useSnackbarStore()
const pluginsStore = usePluginsStore()

const config = ref<PluginSchema>()
const reportDisplayed = ref(true)
const configWithRef = computed(() => config.value && refTheValues(config.value))
const report = ref<PluginReport>()

const updated = ref<Record<string, string>>({})

function refManifest(item: PluginSchema['manifest'][number]) {
  return { ...item, value: ref(item.value) }
}

function refTheValues(service: PluginSchema) {
  return {
    ...service,
    manifestBySection: service.manifest?.map(item => refManifest(item))
      .reduce((acc, curr) => {
        acc.add(curr.section ?? 'Défaut', curr)
        return acc
      }, new ItemCollector<ReturnType<typeof refManifest>>())
      .entries().sort((a, b) => {
        if (b[0] === 'Défaut') {
          return 1
        }
        return a[0].localeCompare(b[0])
      }),
  }
}

async function reload() {
  const resReport = await pluginsStore.getPluginReport(props.name)
  const resConfig = await pluginsStore.getPluginConfig(props.name)
  config.value = undefined
  report.value = undefined
  await nextTick()
  report.value = resReport ?? undefined
  config.value = refTheValues(resConfig)

  updated.value = {}
}

onBeforeMount(() => {
  reload()
})

function update(data: { value: string, key: string }) {
  updated.value[data.key] = data.value
}

async function save() {
  snackbarStore.isWaitingForResponse = true
  try {
    await pluginsStore.updatePluginsConfig({ [props.name]: updated.value })
    snackbarStore.setMessage('Paramètres sauvegardés', 'success')
  } catch (error) {
    console.log(error)
    snackbarStore.setMessage('Erreur lors de la sauvegarde', 'error')
  }
  await reload()
  snackbarStore.isWaitingForResponse = false
}

async function deleteReport() {
  await pluginsStore.deletePluginReport(props.name)
  await reload()
}

async function toggleDisplay() {
  reportDisplayed.value = !reportDisplayed.value
}

const copyButtonProps = ref({
  secondary: false,
  label: 'Copier',
  icon: 'ri:clipboard-line',
})

async function copy() {
  if (report.value?.report) {
    await navigator.clipboard.writeText(report.value.report)
    copyButtonProps.value.label = 'Copié !'
    copyButtonProps.value.secondary = true
    copyButtonProps.value.icon = 'ri:checkbox-circle-line'
    setTimeout(() => {
      copyButtonProps.value.label = 'Copier'
      copyButtonProps.value.secondary = false
      copyButtonProps.value.icon = 'ri:clipboard-line'
    }, 3000)
  }
}
</script>

<template>
  <div
    class="flex flex-row justify-between items-start"
  >
    <h1>Plugin {{ config?.title }}</h1>
    <div class="flex gap-5">
      <DsfrButton
        label="Recharger"
        secondary
        data-testid="reloadBtn"
        icon="ri:refresh-line"
        icon-only
        @click="reload"
      />
      <DsfrButton
        label="Retour"
        secondary
        data-testid="returnBtn"
        icon="ri:arrow-go-back-line"
        icon-only
        @click="$router.push({ name: 'ListPlugins' })"
      />
    </div>
  </div>
  <p
    v-if="config?.description"
  >
    {{ config.description }}
  </p>
  <h3>Configuration</h3>
  <template
    v-if="configWithRef?.manifestBySection.length"
  >
    <div>
      <DsfrCallout
        v-for="[section, manifests] in configWithRef.manifestBySection"
        :key="section"
        :title="section !== 'Défaut' ? section : undefined"
        class="flex flex-col gap-2"
      >
        <ConfigParam
          v-for="item in manifests"
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
          @update="(value: string) => update({ key: item.key, value })"
        />
      </DsfrCallout>
    </div>
    <div
      class="flex justify-end gap-10"
    >
      <DsfrButton
        v-if="Object.values(updated).keys() && Object.values(updated).map(v => Object.keys(v)).length"
        label="Enregistrer"
        data-testid="saveBtn"
        @click="save()"
      />
    </div>
  </template>
  <p v-else>
    Aucun élément de configuration disponible
  </p>
  <div
    class="flex flex-row gap-5 items-center"
  >
    <h3>Rapport</h3>
    <DsfrBadge
      title="La fonctionalité des rapports de plugin est encore expérimentale. Veuillez faire vos propres vérifications avant de supprimer des ressources."
      label="Expérimental"
      class="mb-4"
      type="warning"
    />
    <DsfrBadge
      v-if="report?.updatedAt"
      :label="(new Date(report.updatedAt)).toLocaleString()"
      class="mb-4"
      no-icon
    />
  </div>
  <template v-if="report?.report">
    <div
      class="flex flex-row items-start justify-between"
    >
      <DsfrButton
        :label="reportDisplayed ? 'Réduire' : 'Agrandir'"
        secondary
        @click="toggleDisplay"
      />
      <DsfrButton
        v-bind="copyButtonProps"
        icon-right
        @click="copy"
      />
    </div>
    <div
      :class="`relative flex flex-row items-start justify-between overflow-y-hidden my-5 ${reportDisplayed ? '' : 'max-h-30'}`"
    >
      <pre
        :class="`fr-text-default--info text-xs cursor-text m-0 ${reportDisplayed ? '' : 'max-h-30'}`"
      >{{ JSON.parse(report.report) }}</pre>
      <div
        v-if="!reportDisplayed"
        class="cursor-pointer h-30 absolute w-full mask"
        @click="toggleDisplay"
      />
    </div>

    <DsfrButton
      label="Supprimer"
      secondary
      @click="deleteReport"
    />
  </template>
  <p v-else>
    Aucun rapport disponible
  </p>
</template>

<style scoped>
.mask {
  background: linear-gradient(#0000, var(--background-alt-grey));;
}
</style>
