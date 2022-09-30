<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const routeName = computed(() => route.name)

const isExpanded = ref(false)

function toggleExpand () {
  isExpanded.value = !isExpanded.value
}

watch(routeName, () => {
  isExpanded.value = false
})

</script>

<template>
  <DsfrSideMenu
    heading-title=""
    button-label="Menu"
    @toggle-expand="toggleExpand"
  >
    <DsfrSideMenuList>
      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          :active="routeName === 'Accueil'"
          to="/"
        >
          Accueil
        </DsfrSideMenuLink>
      </DsfrSideMenuListItem>
      <DsfrSideMenuListItem>
        <DsfrSideMenuButton
          :expanded="isExpanded"
          button-label="Mes projets"
          control-id="mes-projets"
          @toggle-expand="toggleExpand(event)"
        >
        Mes projets
        </DsfrSideMenuButton>
        <DsfrSideMenuList
          id="mes-projets"
          :expanded="isExpanded"
          :collapsable="true"
        >
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              :active="routeName === 'Dashboard'"
              to="/tableau-de-bord"
            >
              Tableau de bord
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              :active="routeName === 'MesServices'"
              to="/mes-services"
            >
              Mes services
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              :active="routeName === 'GestionDroits'"
              to="/gestion-droits"
            >
              Gérer les droits
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
        </DsfrSideMenuList>
      </DsfrSideMenuListItem>
      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          :active="routeName === 'Documentation'"
          to="/documentation"
        >
          Documentation
        </DsfrSideMenuLink>
      </DsfrSideMenuListItem>
    </DsfrSideMenuList>
  </DsfrSideMenu>
</template>
