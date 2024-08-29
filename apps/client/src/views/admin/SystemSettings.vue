<script lang="ts" setup>
import { useSystemSettingsStore } from '@/stores/system-settings.js'

const systemStore = useSystemSettingsStore()

onBeforeMount(async () => {
  await systemStore.listSystemSettings()
})

async function upsertSystemSetting(key: string, value: boolean) {
  await systemStore.upsertSystemSetting({ key, value: value ? 'on' : 'off' })
}
</script>

<template>
  <h1>Réglages de la console Cloud π Native</h1>
  <div
    class="flex <md:flex-col-reverse items-center justify-between gap-2 mt-8"
  >
    <DsfrToggleSwitch
      v-for="setting in systemStore.systemSettings"
      :key="setting.key"
      :model-value="setting.value === 'on'"
      :label="`${setting.value === 'on' ? 'Désactiver' : 'Activer'} le mode ${setting.key}`"
      :data-testid="`toggle-${setting.key}`"
      @update:model-value="(event: boolean) => upsertSystemSetting(setting.key, event)"
    />
  </div>
</template>
