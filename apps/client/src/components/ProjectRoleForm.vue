<script lang="ts" setup>
import { ref, computed } from 'vue'
import { Member, PROJECT_PERMS, projectPermsLabels, projectPermsOrder, type Project, shallowEqual } from '@cpn-console/shared'

const props = withDefaults(defineProps<{
  id: string
  permissions: bigint
  name: string
  allMembers: Member[]
  projectId: Project['id']
  isEveryone: boolean
}>(), {
  name: 'Nouveau rôle',
  isEveryone: false,
})

const router = useRouter()
const role = ref({
  ...props,
  permissions: props.permissions ?? 0n,
  allMembers: props.allMembers ?? [],
})

const isUpdated = computed(() => {
  if (role.value.isEveryone) return props.permissions !== role.value.permissions
  return !shallowEqual(props, role.value)
})
const tabListName = 'Liste d’onglet'
const tabTitles = role.value.isEveryone
  ? [
    { title: 'Général', icon: 'ri-checkbox-circle-line' },
  ]
  : [
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

const updateChecked = (checked: boolean, value: bigint) => {
  if (checked) {
    role.value.permissions |= value
  } else {
    role.value.permissions &= ~value
  }
}

defineEmits<{
  delete: []
  updateMemberRoles: [checked: boolean, userId: Member['userId']]
  save: [{ name: string, permissions: bigint }]
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
        :disabled="role.isEveryone"
      />
      <h6>Permissions</h6>
      <DsfrCheckbox
        v-for="key in projectPermsOrder"
        :key="key"
        :model-value="PROJECT_PERMS[key] & role.permissions"
        :label="projectPermsLabels[key]"
        :name="projectPermsLabels[key]"
        :disabled="role.permissions & PROJECT_PERMS.MANAGE && key !== 'MANAGE'"
        @update:model-value="(checked: boolean) => updateChecked(checked, PROJECT_PERMS[key])"
      />
      <DsfrButton
        type="buttonType"
        :label="'Enregistrer'"
        secondary
        :disabled="!isUpdated"
        class="mr-5"
        @click="$emit('save',role)"
      />
      <DsfrButton
        v-if="!role.isEveryone"
        type="buttonType"
        :label="'Supprimer'"
        secondary
        @click="$emit('delete')"
      />
    </DsfrTabContent>
    <DsfrTabContent
      v-if="!role.isEveryone"
      panel-id="members"
      tab-id="tab-1"
      :selected="selectedTabIndex === 1"
      :asc="asc"
    >
      <DsfrCheckbox
        v-for="member in role.allMembers"
        :key="member.email"
        :label="`${member.lastName} ${member.firstName}`"
        :hint="member.email"
        :model-value="member.roleIds.includes(role.id)"
        @update:model-value="(checked: boolean) => $emit('updateMemberRoles', checked, member.userId)"
      />
      <template
        v-if="!role.allMembers.length"
      >
        <div>
          Vous n'avez pas d'utilisateur dans votre projet
        </div>
        <DsfrButton
          type="buttonType"
          label="Gérer l'équipe"
          class="mt-5"
          @click="router.push({ name: 'Team' })"
        />
      </template>
    </DsfrTabContent>
    <DsfrButton
      label="Fermer"
      tertiary
      class="absolute right-0 z-1000 fr-tabs__tab h-auto"
      @click="() => $emit('cancel')"
    />
  </DsfrTabs>
</template>
