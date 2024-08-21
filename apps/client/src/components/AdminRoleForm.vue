<script lang="ts" setup>
import { ref, computed, onBeforeMount } from 'vue'
import { shallowEqual, ADMIN_PERMS, adminPermsDetails, User, LettersQuery, AdminPermsKeys, SharedZodError, RoleSchema } from '@cpn-console/shared'
import SuggestionInput from './SuggestionInput.vue'
import pDebounce from 'p-debounce'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import { useUsersStore } from '@/stores/users.js'

const usersStore = useUsersStore()
const newUserInputKey = ref(getRandomId('input'))

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

const errorSchema = computed<SharedZodError | undefined>(() => {
  const schemaValidation = RoleSchema.partial().safeParse(role.value)
  return schemaValidation.success ? undefined : schemaValidation.error
})

const tabListName = 'Liste d’onglet'
const tabTitles = [
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

const updateChecked = (checked: boolean, name: AdminPermsKeys) => {
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
  furtherInfo: userToAdd.firstName + ' ' + userToAdd.lastName,
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
const newUser = ref<User>()
const newUserInput = ref<string>('')

const isUserAlreadyInTeam = computed(() => {
  return !!(newUserInput.value && usersInRole.value.find(member => member.id === newUser.value?.id))
})

const switchUserMembership = async (checked: boolean, user: User, fromSuggestion = false) => {
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
  users.value = await usersStore.listUsers({ adminRoleId: role.value.id })
})

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
          :model-value="ADMIN_PERMS[perm.key] & role.permissions"
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
        :disabled="!isUpdated || errorSchema"
        class="mr-5"
        @click="$emit('save', {...role, permissions: role.permissions.toString() })"
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
      tab-id="tab-1"
      :selected="selectedTabIndex === 1"
      :asc="asc"
    >
      <template
        v-if="!props.oidcGroup"
      >
        <DsfrCheckbox
          v-for="user in users"
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
            @select-suggestion="(value: string) => newUser = usersToAdd.find(user => user.email === value)"
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
            icon="ri-user-add-line"
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
      tab-id="tab-2"
      :selected="selectedTabIndex === 2"
      :asc="asc"
      @click="() => $emit('cancel')"
    >
      {{ selectedTabIndex === tabTitles.length -1 && $emit('cancel') }}
    </DsfrTabContent>
  </DsfrTabs>
</template>
