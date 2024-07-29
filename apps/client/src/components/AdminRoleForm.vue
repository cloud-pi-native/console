<script lang="ts" setup>
import { ref, computed } from 'vue'
import { adminPermsLabels, shallowEqual, ADMIN_PERMS, adminPermsOrder, AdminPermsKeys } from '@cpn-console/shared'

const props = withDefaults(defineProps<{
  id: string
  permissions: bigint
  name: string
  oidcGroup: string
}>(), {
  name: 'Nouveau rôle',
  oidcGroup: '',
})

const role = ref({
  ...props,
  permissions: props.permissions ?? 0n,
})

const isUpdated = computed(() => {
  return !shallowEqual(props, role.value)
})
const tabListName = 'Liste d’onglet'
const tabTitles = [
  { title: 'Général', icon: 'ri-checkbox-circle-line' },
  { title: 'Membres', icon: 'ri-checkbox-circle-line' },
]

const initialSelectedIndex = 0

const asc = ref(true)
const selectedTabIndex = ref(initialSelectedIndex)

const selectTab = (idx: number) => {
  asc.value = selectedTabIndex.value < idx
  selectedTabIndex.value = idx
}

const updateChecked = (checked: boolean, name: AdminPermsKeys) => {
  if (checked) {
    role.value.permissions |= ADMIN_PERMS[name]
  } else {
    role.value.permissions &= ~ADMIN_PERMS[name]
  }
}

defineEmits<{
  delete: []
  save: [{ name: string, permissions: string, oidcGroup: string }]
  cancel: []
}>()


</script>
<template>
  <DsfrTabs
    ref="roleTabs"
    :tab-list-name="tabListName"
    :tab-titles="tabTitles"
    :initial-selected-index="initialSelectedIndex"
    class="mb-5"
    @select-tab="selectTab"
  >
    <DsfrTabContent
      panel-id="general"
      tab-id="tab-0"
      :selected="selectedTabIndex === 0"
      :asc="asc"
    >
      <h6>Nom du rôle</h6>
      <DsfrInput
        v-model="role.name"
        type="inputType"
        label-visible
        class="mb-5"
      />
      <h6>Permissions</h6>
      <DsfrCheckbox
        v-for="key in adminPermsOrder"
        :key="key"
        :model-value="ADMIN_PERMS[key] & role.permissions"
        :label="adminPermsLabels[key]"
        :name="adminPermsLabels[key]"
        :disabled="role.permissions & ADMIN_PERMS.MANAGE && key !== 'MANAGE'"
        @update:model-value="(checked: boolean) => updateChecked(checked, key)"
      />
      <h6>OIDC Groupe</h6>
      <DsfrInput
        v-model="role.oidcGroup"
        type="inputType"
        label=""
        label-visible
        placeholder="/admin"
        class="mb-5"
      />
      <DsfrButton
        type="buttonType"
        :label="'Enregistrer'"
        secondary
        :disabled="!isUpdated"
        class="mr-5"
        @click="$emit('save', {...role, permissions: role.permissions.toString() })"
      />
      <DsfrButton
        type="buttonType"
        :label="'Supprimer'"
        secondary
        @click="$emit('delete')"
      />
    </DsfrTabContent>
    <DsfrButton
      label="Fermer"
      tertiary
      class="absolute right-0 z-1000 fr-tabs__tab h-auto"
      @click="() => $emit('cancel')"
    />
  </DsfrTabs>
</template>
