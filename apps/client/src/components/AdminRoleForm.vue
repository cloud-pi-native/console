<script lang="ts" setup>
import { ref, computed, onBeforeMount } from 'vue'
import { adminPermsLabels, shallowEqual, ADMIN_PERMS, adminPermsOrder, User, LettersQuery } from '@cpn-console/shared'
import SuggestionInput from './SuggestionInput.vue'
import pDebounce from 'p-debounce'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { DsfrButton, getRandomId } from '@gouvminint/vue-dsfr'

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

const users = ref<User[]>([])
const usersInRole = computed(() => users.value.filter(user => user.adminRoleIds.includes(role.value.id)))

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

const updateChecked = (checked: boolean, value: bigint) => {
  if (checked) {
    role.value.permissions |= value
  } else {
    role.value.permissions &= ~value
  }
}

const lettersNotMatching = ref('')
const usersToAdd = ref<User[]>([])

const retrieveUsersToAdd = pDebounce(async (letters: LettersQuery['letters']) => {
  // Ne pas lancer de requête à moins de 3 caractères tapés
  if (letters.length < 3) return
  // Ne pas relancer de requête à chaque lettre ajoutée si aucun user ne correspond aux premières lettres données
  if (lettersNotMatching.value && letters.includes(lettersNotMatching.value) && !usersToAdd.value?.length) return
  usersToAdd.value = await apiClient.Users.getMatchingUsers({ query: { letters } }).then(res => extractData(res, 200))
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

defineEmits<{
  delete: []
  save: [{ name: string, permissions: string, oidcGroup: string }]
  cancel: []
}>()

const switchUserMembership = async (checked: boolean, user: User, fromSuggestion = false) => {
  const newUserAdminRoleIds = user.adminRoleIds.filter(roleId => roleId !== role.value.id)
  if (checked) {
    newUserAdminRoleIds.push(role.value.id)
  }
  const response = await apiClient.Users.patchUsers({
    body: [{ id: user.id, adminRoleIds: newUserAdminRoleIds }],
  }).then(res => extractData(res, 200))

  if (!users.value.find(({ id }) => user.id === id)) {
    users.value = users.value.concat(response)
  }

  if (fromSuggestion) {
    newUserInput.value = ''
  }
  usersToAdd.value = []
  newUserInputKey.value = getRandomId('input')
}
onBeforeMount(async () => {
  users.value = await apiClient.Users.getAllUsers({ query: { adminRoleId: role.value.id } }).then(res => extractData(res, 200))
})

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
        @update:model-value="(checked: boolean) => updateChecked(checked, ADMIN_PERMS[key])"
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
    <DsfrTabContent
      panel-id="members"
      tab-id="tab-1"
      :selected="selectedTabIndex === 1"
      :asc="asc"
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
      >
        Vous n'avez pas d'utilisateur dans votre projet
      </DsfrNotice>
      <div
        class="w-max"
      >
        <SuggestionInput
          :key="'team'"
          v-model="newUserInput"
          data-testid="addUserSuggestionInput"
          label="Nom, prénom ou adresse mail de l'utilisateur à rechercher"
          label-visible
          hint="Adresse e-mail de l'utilisateur"
          placeholder="prenom.nom@interieur.gouv.fr"
          :suggestions="usersToAdd"
          @select-suggestion="(value: User) => newUser = value"
          @update:model-value="(value: string) => retrieveUsersToAdd(value)"
        />
        <DsfrAlert
          v-if="isUserAlreadyInTeam"
          data-testid="userErrorInfo"
          description="L'utilisateur fait déjà partie du rôle."
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
    </DsfrTabContent>
    <DsfrButton
      label="Fermer"
      tertiary
      class="absolute right-0 z-1000 fr-tabs__tab h-auto"
      @click="() => $emit('cancel')"
    />
  </DsfrTabs>
</template>
