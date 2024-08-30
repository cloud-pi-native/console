<script lang="ts" setup>
import type { SystemSettings } from '@cpn-console/shared'
import { useSystemSettingsStore } from '@/stores/system-settings.js'

const systemStore = useSystemSettingsStore()

const updated = ref<Record<string, Record<string, string>>>({})

// permet de definir quel input choisir ??
// function refTheValues(settings: SystemSetting[]) {
//   return settings.map((setting) => {
//     return {
//       ...setting,
//       // manifest ??
//     }
//   })
// }

const systemSettings = ref<SystemSettings>()

// reload les settings
async function reload() {
  await systemStore.listSystemSettings()
  systemSettings.value = systemStore.systemSettings

  updated.value = {}
}

onBeforeMount(async () => {
  // await systemStore.listSystemSettings()
  reload()
})

// A modifié pour save les settings dynamiquement
async function upsertSystemSetting(key: string, value: boolean) {
  // await systemStore.upsertSystemSetting({ key, value: value ? 'on' : 'off' })
  console.log(key + value)
}
</script>

<template>
  <h1>Réglages de la console Cloud π Native</h1>
  <div
    class="flex <md:flex-col items-center justify-between gap-2 mt-8"
  >
    <!-- {{ systemSettings }} -->
    <DsfrToggleSwitch
      :model-value="systemSettings.maintenance === 'on'"
      :label="`${systemSettings.maintenance === 'on' ? 'Désactiver' : 'Activer'} le mode maintenance`"
      data-testid="toggle-maintenance"
      @update:model-value="(event: boolean) => upsertSystemSetting('maintenance', event)"
    />
    <DsfrInput
      v-model="systemSettings.appName"
      data-testid="input-appName"
      label="appName"
      label-visible
    />
    <DsfrInput
      v-model="systemSettings.contactMail"
      data-testid="input-contactMail"
      label="contactMail"
      label-visible
    />
    <DsfrInput
      v-model="systemSettings.appSubTitle"
      data-testid="input-appSubTitle"
      label="appSubTitle"
      label-visible
    />
  </div>
</template>

<!-- <template>
  <h1>Réglages de la console Cloud π Native</h1>
  <div
    v-if="!systemStore.systemSettings.length"
    class="flex <md:flex-col-reverse items-center justify-between gap-2 mt-8"
  >
    <div> -->
      <!-- trouvé comment faire du l'input dynamique -->
      <!-- HINT : etablir des regle, ex : on|off => switch, sinon input classic -->
    <!-- </div>
  </div>
</template> -->
