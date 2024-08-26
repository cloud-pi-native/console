<script lang="ts" setup>
import { ref, computed } from 'vue'
import { Member, PROJECT_PERMS, projectPermsDetails, type Project, shallowEqual, RoleBigint } from '@cpn-console/shared'

const props = defineProps<{
  id: string
  permissions: bigint
  name: string
  allMembers: Member[]
  projectId: Project['id']
  isEveryone: boolean
}>()

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
const tabTitles = props.isEveryone
  ? [
    { title: 'Général', icon: 'ri-checkbox-circle-line', tabId: 'general' },
    { title: 'Fermer', icon: 'ri-checkbox-circle-line', tabId: 'fermer' },
  ]
  : [
    { title: 'Général', icon: 'ri-checkbox-circle-line', tabId: 'general' },
    { title: 'Membres', icon: 'ri-checkbox-circle-line', tabId: 'membres' },
    { title: 'Fermer', icon: 'ri-checkbox-circle-line', tabId: 'fermer' },
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
  save: [value: Omit<RoleBigint, 'position'>]
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
        data-testid="roleNameInput"
        label-visible
        class="mb-5"
        :disabled="role.isEveryone"
      />
      <h6>Permissions</h6>
      <div
        v-for="scope in projectPermsDetails"
        :key="scope.name"
      >
        <p
          class="mb-3 ml-2 font-bold font-underline"
        >
          {{ scope.name }}
        </p>
        <DsfrCheckbox
          v-for="perm in scope.perms"
          :id="`${perm.key}-cbx`"
          :key="perm.key"
          :model-value="PROJECT_PERMS[perm.key] & role.permissions"
          :label="perm?.label"
          :hint="perm?.hint"
          :name="perm.key"
          :disabled="role.permissions & PROJECT_PERMS.MANAGE && perm.key !== 'MANAGE'"
          @update:model-value="(checked: boolean) => updateChecked(checked, PROJECT_PERMS[perm.key])"
        />
      </div>
      <DsfrButton
        label="Enregistrer"
        data-testid="saveBtn"
        secondary
        :disabled="!isUpdated"
        class="mr-5"
        @click="$emit('save',role)"
      />
      <DsfrButton
        v-if="!role.isEveryone"
        data-testid="deleteBtn"
        label="Supprimer"
        secondary
        @click="$emit('delete')"
      />
    </DsfrTabContent>
    <DsfrTabContent
      v-if="!props.isEveryone"
      panel-id="members"
      tab-id="tab-1"
      :selected="selectedTabIndex === 1"
      :asc="asc"
    >
      <DsfrCheckbox
        v-for="member in role.allMembers"
        :id="`${member.userId}-cbx`"
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
          label="Gérer l'équipe"
          class="mt-5"
          @click="router.push({ name: 'Team' })"
        />
      </template>
    </DsfrTabContent>
    <div
      class="ms-8"
    >
      <DsfrTabContent
        panel-id="close"
        tab-id="tab-2"
        :selected="selectedTabIndex === 2"
        :asc="asc"
        @click="() => $emit('cancel')"
      >
        {{ selectedTabIndex === tabTitles.length -1 && $emit('cancel') }}
      </DsfrTabContent>
    </div>
  </DsfrTabs>
</template>
