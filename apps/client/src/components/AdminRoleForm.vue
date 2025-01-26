<script lang="ts" setup>
import { computed, onBeforeMount, ref } from 'vue'
import type { AdminPermsKeys, LettersQuery, SharedZodError, User } from '@cpn-console/shared'
import { ADMIN_PERMS, RoleSchema, adminPermsDetails, shallowEqual } from '@cpn-console/shared'
import pDebounce from 'p-debounce'
import { getRandomId } from '@gouvminint/vue-dsfr'
import SuggestionInput from './SuggestionInput.vue'
import { useUsersStore } from '@/stores/users.js'

const props = withDefaults(defineProps<{
  id: string
  permissions: bigint
  name: string
  oidcGroup: string
}>(), {
  name: 'Nouveau rôle',
  oidcGroup: '',
})
defineEmits<{
  delete: []
  save: [{ name: string, permissions: string, oidcGroup: string }]
  cancel: []
}>()
const usersStore = useUsersStore()
const newUserInputKey = ref(getRandomId('input'))

const role = ref({
  ...props,
  permissions: props.permissions ?? 0n,
})

const isUpdated = computed(() => {
  return !shallowEqual(props, role.value)
})

const errorSchema = computed<SharedZodError | undefined>(() => {
  const schemaValidation = RoleSchema.partial().safeParse(role.value)
  return schemaValidation.success ? undefined : schemaValidation.error
})

const tabListName = 'Liste d’onglet'
const tabTitles = [
  { title: 'Général', icon: 'ri:checkbox-circle-line', tabId: 'general' },
  { title: 'Membres', icon: 'ri:checkbox-circle-line', tabId: 'members' },
  { title: 'Fermer', icon: 'ri:close-line', tabId: 'close' },
]

const initialSelectedIndex = 0

const selectedTabIndex = ref(initialSelectedIndex)

function updateChecked(checked: boolean, name: AdminPermsKeys) {
  if (checked) {
    role.value.permissions |= ADMIN_PERMS[name]
  } else {
    role.value.permissions &= ~ADMIN_PERMS[name]
  }
}

const users = ref<User[]>([])
const usersInRole = computed(() => users.value.filter(user => user.adminRoleIds.includes(role.value.id)))

const lettersNotMatching = ref('')
const usersToAdd = ref<User[]>([])
const usersToSuggest = computed(() => usersToAdd.value.map(userToAdd => ({
  value: userToAdd.email,
  furtherInfo: `${userToAdd.firstName} ${userToAdd.lastName}`,
})))

const retrieveUsersToAdd = pDebounce(async (letters: LettersQuery['letters']) => {
  // Ne pas lancer de requête à moins de 3 caractères tapés
  if (letters.length < 3) return
  // Ne pas relancer de requête à chaque lettre ajoutée si aucun user ne correspond aux premières lettres données
  if (lettersNotMatching.value && letters.includes(lettersNotMatching.value) && !usersToAdd.value?.length) return
  usersToAdd.value = await usersStore.listMatchingUsers({ letters })
  // Stockage des lettres qui ne renvoient aucun résultat
  if (!usersToAdd.value?.length) {
    lettersNotMatching.value = letters
  }
}, 300)

const newUserInput = ref<string>('')
const newUser = computed(() => usersToAdd.value.find(user => user.email === newUserInput.value))

const isUserAlreadyInTeam = computed(() => {
  return !!(newUserInput.value && usersInRole.value.find(member => member.id === newUser.value?.id))
})

async function switchUserMembership(checked: boolean, user: User, fromSuggestion = false) {
  const newUserAdminRoleIds = user.adminRoleIds.filter(roleId => roleId !== role.value.id)
  if (checked) {
    newUserAdminRoleIds.push(role.value.id)
  }
  const response = await usersStore.patchUsers([{ id: user.id, adminRoleIds: newUserAdminRoleIds }])

  if (!users.value.find(({ id }) => user.id === id)) {
    users.value = users.value.concat(response)
  }

  if (fromSuggestion) {
    newUserInput.value = ''
    usersToAdd.value = []
    newUserInputKey.value = getRandomId('input')
  }
}
onBeforeMount(async () => {
  users.value = await usersStore.listUsers({ adminRoleIds: role.value.id })
})
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
        hint="Ne doit pas dépasser 30 caractères."
        class="mb-5"
      />
      <p
        class="fr-h6"
      >
        Permissions
      </p>
      <div
        v-for="scope in adminPermsDetails"
        :key="scope.name"
      >
        <p
          class="mb-2 font-bold"
        >
          {{ scope.name }}
        </p>
        <DsfrCheckbox
          v-for="perm in scope.perms"
          :key="perm.key"
          :model-value="!!(ADMIN_PERMS[perm.key] & role.permissions)"
          :data-testid="`${perm.key}-cbx`"
          :label="perm.label"
          :hint="perm?.hint"
          :name="perm.key"
          :disabled="role.permissions & ADMIN_PERMS.MANAGE && perm.key !== 'MANAGE'"
          @update:model-value="(checked: boolean) => updateChecked(checked, perm.key)"
        />
      </div>
      <DsfrInput
        v-model="role.oidcGroup"
        data-testid="oidcGroupInput"
        label="Groupe OIDC"
        label-visible
        placeholder="/admin"
        class="mb-5"
      />
      <DsfrButton
        data-testid="saveBtn"
        label="Enregistrer"
        secondary
        :disabled="!isUpdated || !!errorSchema"
        class="mr-5"
        @click="$emit('save', { ...role, permissions: role.permissions.toString() })"
      />
      <DsfrButton
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
        v-if="!props.oidcGroup"
      >
        <DsfrCheckbox
          v-for="user in users"
          :id="`${user.id}-cbx`"
          :key="user.email"
          :label="`${user.lastName} ${user.firstName}`"
          :hint="user.email"
          :model-value="user.adminRoleIds.includes(role.id)"
          @update:model-value="(checked: boolean) => switchUserMembership(checked, user)"
        />
        <DsfrNotice
          v-if="!users.length"
          class="mb-5"
          data-testid="noUserNotice"
          title="Aucun utilisateur ne dispose actuellement de ce rôle."
        />
        <div
          class="w-max"
        >
          <SuggestionInput
            :key="newUserInputKey"
            v-model="newUserInput"
            data-testid="addUserSuggestionInput"
            label="Nom, prénom ou adresse mail de l'utilisateur à rechercher"
            label-visible
            hint="Adresse e-mail de l'utilisateur"
            placeholder="prenom.nom@interieur.gouv.fr"
            :suggestions="usersToSuggest"
            @update:model-value="(value: string) => retrieveUsersToAdd(value)"
          />
          <DsfrAlert
            v-if="isUserAlreadyInTeam"
            data-testid="userErrorInfo"
            description="L'utilisateur est déjà détenteur de ce rôle."
            small
            type="error"
            class="w-max fr-mb-2w"
          />
          <DsfrButton
            data-testid="addUserBtn"
            label="Ajouter l'utilisateur"
            secondary
            icon="ri:user-add-line"
            :disabled="!newUserInput || isUserAlreadyInTeam || !newUser"
            @click="() => newUser && switchUserMembership(true, newUser, true)"
          />
        </div>
      </template>
      <template
        v-else
      >
        Les groupes ayant une liaison OIDC ne peuvent pas gérer leurs membres.
      </template>
    </DsfrTabContent>
    <DsfrTabContent
      panel-id="close"
      tab-id="close"
      @click="() => $emit('cancel')"
    >
      {{ selectedTabIndex === tabTitles.length - 1 && $emit('cancel') }}
    </DsfrTabContent>
  </DsfrTabs>
</template>
