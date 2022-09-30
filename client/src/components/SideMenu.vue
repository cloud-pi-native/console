<script setup>

defineProps({
  
});

</script>

<template>

  <DsfrSideMenu
      heading-title=""
      buttonLabel="Menu"
      @toggle-expand="toggleExpand"
      >
<DsfrSideMenuList
>
<DsfrSideMenuListItem
  :active="active"
>
<DsfrSideMenuLink
  :active="active"
  to="/"
>
Accueil
</DsfrSideMenuLink>
  
</DsfrSideMenuListItem>
<DsfrSideMenuListItem
  :active="active"
>
  <DsfrSideMenuButton
    :expanded="expanded"
    button-label="Mes projets"
    :control-id="controlId"
    @toggle-expand="toggleExpand(event)"
  />
  <DsfrSideMenuList
          :id="controlId"
          :expanded="expanded"
          :collapsable="true"
        >
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              to="/tableau-de-bord"
            >
              Tableau de bord
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              to="/mes-services"
            >
              Mes services
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              to="/gestion-droits"
            >
              Gérer les droits
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
        </DsfrSideMenuList>
</DsfrSideMenuListItem>
<DsfrSideMenuListItem
  :active="active"
>
<DsfrSideMenuLink
  :active="active"
  to="/documentation"
>
Documentation
</DsfrSideMenuLink>
  
</DsfrSideMenuListItem>
</DsfrSideMenuList>
</DsfrSideMenu>

</template>
