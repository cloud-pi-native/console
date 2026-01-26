<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { Member, ProjectV2, RoleBigint } from '@cpn-console/shared'
import { shallowEqual } from '@cpn-console/shared'
import { storeToRefs } from 'pinia'
import { usePermissionsStore } from '@/stores/permissions.js'

const props = defineProps<{
  id: string
  permissions: bigint
  name: string
  allMembers: Member[]
  projectId: ProjectV2['id']
  isEveryone: boolean
}>()

defineEmits<{
  delete: []
  updateMemberRoles: [checked: boolean, userId: Member['userId']]
  save: [value: Omit<RoleBigint, 'position'>]
  cancel: []
}>()

const permissionsStore = usePermissionsStore()
const { projectPermsDetails, projectPerms } = storeToRefs(permissionsStore)

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
const tabTitles = [
  { title: 'Général', icon: 'ri:checkbox-circle-line', tabId: 'general' },
  { title: 'Membres', icon: 'ri:checkbox-circle-line', tabId: 'members' },
  { title: 'Fermer', icon: 'ri:close-line', tabId: 'close' },
]

const initialSelectedIndex = 0

const selectedTabIndex = ref(initialSelectedIndex)

function updateChecked(checked: boolean, value: bigint) {
  if (checked) {
    role.value.permissions |= value
  } else {
    role.value.permissions &= ~value
  }
}
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
          :model-value="!!(projectPerms[perm.key] & role.permissions)"
          :label="perm?.label"
          :hint="perm?.hint"
          :name="perm.key"
          :disabled="!!(role.permissions & projectPerms.MANAGE) && perm.key !== 'MANAGE'"
          @update:model-value="(checked: boolean) => updateChecked(checked, projectPerms[perm.key])"
        />
      </div>
      <DsfrButton
        label="Enregistrer"
        data-testid="saveBtn"
        secondary
        :disabled="!isUpdated"
        class="mr-5"
        @click="$emit('save', role)"
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
          :label="`${member.lastName} ${member.firstName}`"
          :hint="member.email"
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
