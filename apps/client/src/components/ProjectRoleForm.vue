<script lang="ts" setup>
import type { Member, ProjectRoleBigint, ProjectV2 } from '@cpn-console/shared'
import { PROJECT_PERMS, projectPermsDetails, shallowEqual } from '@cpn-console/shared'
import { computed, ref } from 'vue'

const props = defineProps<{
  id: string
  permissions: bigint
  name: string
  allMembers: Member[]
  projectId: ProjectV2['id']
  isEveryone: boolean
  oidcGroup?: string
  type?: string
}>()

defineEmits<{
  delete: []
  updateMemberRoles: [checked: boolean, userId: Member['userId']]
  save: [value: Omit<ProjectRoleBigint, 'position' | 'projectId'>]
  cancel: []
}>()
const router = useRouter()
const role = ref({
  ...props,
  permissions: props.permissions ?? 0n,
  allMembers: props.allMembers ?? [],
  oidcGroup: props.oidcGroup ?? '',
  type: props.type ?? 'managed',
})

const isSystem = computed(() => role.value.type?.startsWith('system:'))
const isManagedRole = computed(() => role.value.type.endsWith('managed'))
const systemTypePrefix = 'system:'
const roleTypeForSelect = computed({
  get() {
    const type = role.value.type
    if (type?.startsWith(systemTypePrefix)) return type.slice(systemTypePrefix.length)
    return type ?? 'managed'
  },
  set(value) {
    if (role.value.type?.startsWith(systemTypePrefix)) role.value.type = `${systemTypePrefix}${value}`
    else role.value.type = value
  },
})

const isUpdated = computed(() => {
  if (role.value.isEveryone) return props.permissions !== role.value.permissions
  return !shallowEqual(props, role.value)
})

const tabListName = 'Liste d’onglet'
const tabTitles = computed(() => [
  { title: 'Général', icon: 'ri:checkbox-circle-line', tabId: 'general' },
  ...(
    isManagedRole.value
      ? [{ title: 'Membres', icon: 'ri:checkbox-circle-line', tabId: 'members' }]
      : []),
  { title: 'Fermer', icon: 'ri:close-line', tabId: 'close' },
])

const initialSelectedIndex = 0

const selectedTabIndex = ref(initialSelectedIndex)

function updateChecked(checked: boolean, value: bigint) {
  if (checked) {
    role.value.permissions |= value
  } else {
    role.value.permissions &= ~value
  }
}

const typeOptions = [
  { text: 'Managé', value: 'managed' },
  { text: 'Externe', value: 'external' },
  { text: 'Global', value: 'global' },
]
</script>

<template>
  <DsfrTabs
    v-model="selectedTabIndex"
    :tab-list-name="tabListName"
    :tab-titles="tabTitles"
    class="mb-5"
  >
    <DsfrTabContent
      panel-id="general"
      tab-id="general"
    >
      <DsfrInput
        v-model="role.name"
        data-testid="roleNameInput"
        label="Nom du rôle"
        label-visible
        class="mb-5"
        :disabled="role.isEveryone || isSystem"
      />
      <template v-if="!role.isEveryone">
        <DsfrSelect
          v-model="roleTypeForSelect"
          data-testid="roleTypeSelect"
          select-id="roleTypeSelect"
          label="Type"
          label-visible
          :options="typeOptions"
          class="mb-5"
          :disabled="isSystem"
        />
        <DsfrInput
          v-model="role.oidcGroup"
          data-testid="roleOidcGroupInput"
          label="Groupe OIDC"
          label-visible
          class="mb-5"
          :disabled="isSystem"
        />
      </template>
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
          value=""
          :model-value="!!(PROJECT_PERMS[perm.key] & role.permissions)"
          :label="perm?.label"
          :hint="perm?.hint"
          :name="perm.key"
          :disabled="isSystem || (role.permissions & PROJECT_PERMS.MANAGE && perm.key !== 'MANAGE')"
          @update:model-value="(checked: boolean) => updateChecked(checked, PROJECT_PERMS[perm.key])"
        />
      </div>
      <DsfrButton
        label="Enregistrer"
        data-testid="saveBtn"
        secondary
        :disabled="!isUpdated || isSystem"
        class="mr-5"
        @click="$emit('save', role)"
      />
      <DsfrButton
        v-if="!role.isEveryone && !isSystem"
        data-testid="deleteBtn"
        label="Supprimer"
        secondary
        @click="$emit('delete')"
      />
    </DsfrTabContent>
    <DsfrTabContent
      panel-id="members"
      tab-id="members"
    >
      <template
        v-if="props.isEveryone"
      >
        <DsfrNotice
          class="mb-5"
          title="Le rôle par défaut 'Tout le monde' inclut tous les utilisateurs de l'équipe"
        />
        <DsfrCheckbox
          v-for="member in role.allMembers"
          :id="`${member.userId}-cbx`"
          :key="member.email"
          value=""
          name="'checkbox-' + member.id"
          :label="`${member.lastName} ${member.firstName}`"
          :hint="member.email"
          :disabled="isEveryone"
          :model-value="true"
        />
      </template>
      <template
        v-else
      >
        <DsfrCheckbox
          v-for="member in role.allMembers"
          :id="`${member.userId}-cbx`"
          :key="member.email"
          value=""
          name="'checkbox-' + member.id"
          :label="`${member.lastName} ${member.firstName}`"
          :hint="member.email"
          :disabled="isSystem"
          :model-value="member.roleIds.includes(role.id)"
          @update:model-value="(checked: boolean) => $emit('updateMemberRoles', checked, member.userId)"
        />
      </template>
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
        tab-id="close"
        @click="() => $emit('cancel')"
      >
        {{ selectedTabIndex === tabTitles.length - 1 && $emit('cancel') }}
      </DsfrTabContent>
    </div>
  </DsfrTabs>
</template>
