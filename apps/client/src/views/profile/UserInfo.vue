<script lang="ts" setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user.js'

const userStore = useUserStore()

const displayAllGroups = ref(false)
const groupsLengthDisplayed = 10
const groups = computed<string[]>(() => userStore.userProfile?.groups?.length ? userStore.userProfile.groups : ['-'])
const adminRoles = computed<string[]>(() => userStore.myAdminRoles.map(({ name }) => name))
</script>

<template>
  <div
    v-if="userStore.userProfile"
  >
    <DsfrTable
      title="Informations utilisateur"
      data-testid="profileInfos"
    >
      <tr /> <!-- laissez comme ça c'est pour forcer l'alternance de couleur sinon c'est pas beau -->
      <tr>
        <td>Nom, prénom</td><td>{{ userStore.userProfile.lastName }}, {{ userStore.userProfile.firstName }}</td>
      </tr>
      <tr>
        <td>Email</td><td>{{ userStore.userProfile.email }}</td>
      </tr>
      <tr>
        <td>Id Keycloak</td><td>{{ userStore.userProfile.id }}</td>
      </tr>
      <tr>
        <td>Roles Admins</td>
        <td>
          <ul>
            <li
              v-for="role in adminRoles"
              :key="role"
            >
              {{ role }}
            </li>
          </ul>
        </td>
      </tr>
      <tr>
        <td>Groupes Keycloak</td>
        <td>
          <ul>
            <li
              v-for="group in groups.slice(0, displayAllGroups ? groups.length : groupsLengthDisplayed)"
              :key="group"
            >
              {{ group }}
            </li>
          </ul>
          <DsfrButton
            v-if="groups.length > groupsLengthDisplayed"
            secondary
            @click="displayAllGroups = !displayAllGroups"
          >
            {{ displayAllGroups ? 'Masquer' : 'Afficher plus...' }}
          </DsfrButton>
        </td>
      </tr>
    </DsfrTable>
  </div>
</template>
