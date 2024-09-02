<script lang="ts" setup>
import type { SystemSettings } from '@cpn-console/shared'
import ConfigParam from '@/components/ConfigParam.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useSystemSettingsStore } from '@/stores/system-settings.js'

const systemStore = useSystemSettingsStore()

const systemSettings = ref<SystemSettings>()

const updatedSystemSettings = ref<Partial<SystemSettings>>()

onBeforeMount(async () => {
  await systemStore.listSystemSettings()
  // spread de l'objet, sans quoi la valeur est également mutée dans le store
  systemSettings.value = { ...systemStore.systemSettings } as SystemSettings
})

function update({ key, value }: { key: string, value: boolean | string }) {
  if (!systemSettings.value) return
  if (typeof value === 'boolean') {
    // @ts-expect-error ts-plugin(7053)
    systemSettings.value[key] = value ? 'true' : 'false'
  } else {
    // @ts-expect-error ts-plugin(7053)
    systemSettings.value[key] = value
  }
}

async function upsertSystemSetting() {
  if (!systemSettings.value) return
  // TODO à réécrire (typage) : création d'un objet ne contenant que les clés réellement mises à jour par rapport à la config reçue de l'api
  Object
    .keys(systemSettings.value)
    .forEach(
      (key) => {
        if (systemSettings.value
          && systemStore.systemSettings
          // @ts-expect-error 7053
          && systemSettings.value[key] !== systemStore.systemSettings[key]) {
          updatedSystemSettings.value = {
            ...updatedSystemSettings.value,
            // @ts-expect-error 7053
            [key]: systemSettings.value[key],
          }
        }
      },
    )
  if (!updatedSystemSettings.value) return
  await systemStore.upsertSystemSettings(updatedSystemSettings.value)
  systemSettings.value = { ...systemStore.systemSettings } as SystemSettings
  useSnackbarStore().setMessage('Réglages mis à jour', 'success')
}
</script>

<template>
  <h1>Réglages de la console Cloud π Native</h1>
  <DsfrNotice
    v-if="!systemSettings"
    title="Aucun réglage à configurer."
  />
  <div
    v-else
  >
    <DsfrNotice
      title="Les réglages se surchargent dans l'ordre suivant : base de donnée > variable d'environnement > JSON de configuration > valeurs par défaut."
    />
    <div
      class="flex flex-col gap-2 my-8"
    >
      <ConfigParam
        v-for="setting in Object.keys(systemSettings)"
        :key="setting"
        :options="{
          // @ts-expect-error ts-plugin(7053)
          value: systemSettings[setting] === 'false'
            // @ts-expect-error ts-plugin(7053)
            ? false : systemSettings[setting] === 'true'
              // @ts-expect-error ts-plugin(7053)
              ? true : systemSettings[setting],
          // @ts-expect-error ts-plugin(7053)
          kind: ['false', 'true'].includes(systemSettings[setting]) ? 'realSwitch' : 'text',
          label: setting,
          disabled: false,
          description: undefined,
          name: undefined,
          placeholder: undefined,
        }"
        @update="(value: string | boolean) => update({ key: setting, value })"
      />
    </div>
    <DsfrButton
      label="Enregistrer"
      data-testid="button-submit"
      secondary
      @click="upsertSystemSetting()"
    />
  </div>
</template>
