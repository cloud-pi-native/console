<script lang="ts" setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { useAdminRoleStore } from '@/stores/admin-role.js'

const userStore = useUserStore()
const adminRoleStore = useAdminRoleStore()

const groups = ref<string[]>([])
const adminRoles = ref<string[]>([])
userStore.$subscribe(() => {
  groups.value = userStore.userProfile?.groups?.length ? userStore.userProfile.groups : ['-']
  adminRoles.value = adminRoleStore.roles.map(({ name }) => name)
})
</script>

<template>
  <div
    v-if="userStore.userProfile"
  >
    <DsfrTable
      title="Informations utilisateur"
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
        <td>Groupes Keycloak</td>
        <td>
          <ul>
            <li
              v-for="group in groups"
              :key="group"
            >
              {{ group }}
            </li>
          </ul>
        </td>
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
    </DsfrTable>
  </div>
</template>
