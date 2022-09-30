<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const routeName = computed(() => route.name)

const isExpanded = ref({
  menuPrincipal: true,
  mesProjets: false,
})

function toggleExpand (key) {
  isExpanded.value[key] = !isExpanded.value[key]
}

watch(routeName, () => {
  isExpanded.value.menuPrincipal = false
  isExpanded.value.mesProjets = false

  Object.keys(isExpanded)
    .forEach(key => {
      isExpanded.value[key] = false
    })
})

</script>

<template>
  <!-- TODO : voir https://discord.com/channels/690194719011242153/797040508508700692/1025424011133472838 -->
  <DsfrSideMenu
    id="menuPrincipal"
    data-testid="menuPrincipal"
    heading-title=""
    button-label="Menu"
    @toggle-expand="toggleExpand('menuPrincipal')"
  >
    <DsfrSideMenuList
      :expanded="isExpanded.menuPrincipal"
    >
      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          data-testid="menuAccueil"
          :active="routeName === 'Accueil'"
          to="/"
        >
          Accueil
        </DsfrSideMenuLink>
      </DsfrSideMenuListItem>
      <DsfrSideMenuListItem>
        <DsfrSideMenuButton
          data-testid="menuMesProjetsBtn"
          :active="false"
          :expanded="isExpanded.mesProjets"
          button-label="Mes projets"
          control-id="mesProjets"
          @toggle-expand="toggleExpand('mesProjets')"
        >
          Mes projets
        </DsfrSideMenuButton>
        <DsfrSideMenuList
          id="mesProjets"
          data-testid="menuMesProjetsList"
          :expanded="isExpanded.mesProjets"
          :collapsable="true"
        >
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              data-testid="menuDashboard"
              :active="routeName === 'Dashboard'"
              to="/tableau-de-bord"
            >
              Tableau de bord
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              data-testid="menuMesServices"
              :active="routeName === 'MesServices'"
              to="/mes-services"
            >
              Mes services
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              data-testid="menuGestionDroits"
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
          data-testid="menuDocumentation"
          :active="routeName === 'Documentation'"
          to="/documentation"
        >
          Documentation
        </DsfrSideMenuLink>
      </DsfrSideMenuListItem>
    </DsfrSideMenuList>
  </DsfrSideMenu>
</template>

<!-- TODO : voir https://discord.com/channels/690194719011242153/797040508508700692/1025426773380431975 -->
<style scoped>
.fr-sidemenu__btn[aria-current="false"] {
  color: var(--text-action-high-grey)
}

.fr-sidemenu__btn[aria-current="false"]::after {
  display: none;
}
</style>
