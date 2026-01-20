<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import { ProjectAuthorized } from '@cpn-console/shared'
import type { ProjectV2 } from '@cpn-console/shared'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'
import { useStageStore } from '@/stores/stage.js'
import router from '@/router/index.js'
import { useClusterStore } from '@/stores/cluster.js'
import { useZoneStore } from '@/stores/zone.js'
import OperationPanel from '@/components/OperationPanel.vue'
import ProjectClustersInfos from '@/components/ProjectClustersInfos.vue'
import { getRandomId } from '@/utils/func.js'
import ProjectSettings from '@/components/ProjectSettings.vue'

const props = withDefaults(defineProps<{
  projectSlug: ProjectV2['slug']
  parentRoute: string
  asProfile: 'user' | 'admin'
  tab?: DashboardPanelTabs
}>(), {
  tab: 'resources',
})

const projectStore = useProjectStore()
const zoneStore = useZoneStore()
const clusterStore = useClusterStore()
const userStore = useUserStore()
const stageStore = useStageStore()

const teamId = ref(getRandomId('team'))

const project = computed(() => projectStore.projectsBySlug[props.projectSlug])

function unSelectProject() {
  router.push({ name: props.parentRoute })
}

async function archive() {
  unSelectProject()
  projectStore.listMyProjects()
}

onBeforeMount(async () => {
  await Promise.all([
    stageStore.getAllStages(),
    clusterStore.getClusters(),
    zoneStore.getAllZones(),
  ])
})

const tabListName = 'Liste d’onglet'

type DashboardPanelTabs = 'resources' | 'services' | 'team' | 'roles' | 'logs' | 'clusters' | 'configuration'
interface TabTitle { title: string, icon: `${string}:${string}`, tabId: `tab-${DashboardPanelTabs}`, panelId: `panel-${DashboardPanelTabs}` }

const resourcesTitle: TabTitle = { title: 'Ressources', icon: 'ri:shapes-line', tabId: 'tab-resources', panelId: 'panel-resources' }
const servicesTitle: TabTitle = { title: 'Services externes', icon: 'ri:flow-chart', tabId: 'tab-services', panelId: 'panel-services' }
const teamTitle: TabTitle = { title: 'Équipe', icon: 'ri:team-line', tabId: 'tab-team', panelId: 'panel-team' }
const rolesTitle: TabTitle = { title: 'Rôles', icon: 'ri:admin-line', tabId: 'tab-roles', panelId: 'panel-roles' }
const logsTitle: TabTitle = { title: 'Journaux', icon: 'ri:newspaper-line', tabId: 'tab-logs', panelId: 'panel-logs' }
const clustersTitle: TabTitle = { title: 'Clusters', icon: 'ri:server-line', tabId: 'tab-clusters', panelId: 'panel-clusters' }
const configurationTitle: TabTitle = { title: 'Configuration', icon: 'ri:settings-5-line', tabId: 'tab-configuration', panelId: 'panel-configuration' }
const tabTitles: TabTitle[] = [
  resourcesTitle,
  servicesTitle,
  teamTitle,
  rolesTitle,
  logsTitle,
  clustersTitle,
  configurationTitle,
]

const activeTab = ref(Math.max(tabTitles.findIndex(tab => `tab-${router.currentRoute.value.query?.tab}` === tab.tabId), 0))
const saveProjectState = ref({
  isProcessing: false,
})

async function refreshMembers() {
  await project.value.Members.list()
  teamId.value = getRandomId('team')
}

async function leaveProject() {
  if (props.asProfile === 'user') {
    return unSelectProject()
  }
  await refreshMembers()
}

watch(activeTab, (tabIndex) => {
  const tabId = tabTitles[tabIndex].tabId
  if (tabId) {
    router.replace({
      query: {
        ...router.currentRoute.value.query,
        tab: tabId.replace(/^tab-/, ''),
      },
    })
  }
})

async function saveProject() {
  saveProjectState.value.isProcessing = true
  await project.value.Commands.update({
    description: project.value.description,
    limitless: project.value.limitless,
    hprodMemory: project.value.hprodMemory,
    hprodCpu: project.value.hprodCpu,
    hprodGpu: project.value.hprodGpu,
    prodMemory: project.value.prodMemory,
    prodCpu: project.value.prodCpu,
    prodGpu: project.value.prodGpu,
  }).finally(() => project.value.Commands.refresh())
  saveProjectState.value.isProcessing = false
}
</script>

<template>
  <div
    class="w-full flex gap-4 justify-end fr-mb-1w"
  >
    <DsfrButton
      v-if="project"
      title="Revenir à la liste des projets"
      data-testid="goBackBtn"
      secondary
      icon-only
      icon="ri:arrow-go-back-line"
      @click="unSelectProject"
    />
  </div>
  <template v-if="project">
    <div>
      <ProjectBanner
        :model-value="project.description"
        :project="project"
        :can-edit-description="asProfile === 'user' && ProjectAuthorized.Manage({ projectPermissions: project.myPerms })"
        @update:model-value="(desc: string | undefined) => { project.description = desc }"
        @save-description="saveProject"
      />
      <ProjectAction
        :project="project"
        :hide-replay="asProfile === 'user' && !ProjectAuthorized.ReplayHooks({ projectPermissions: project.myPerms })"
        :hide-archive="asProfile === 'user' && !ProjectAuthorized.Manage({ projectPermissions: project.myPerms })"
        :hide-secrets="asProfile === 'user' && !ProjectAuthorized.SeeSecrets({ projectPermissions: project.myPerms })"
        :hide-lock="asProfile === 'user'"
        class="px-4"
        @archive="archive"
      />
      <DsfrTabs
        v-model="activeTab"
        :tab-list-name="tabListName"
        :tab-titles="tabTitles"
        class="mt-5"
      >
        <DsfrTabContent
          :panel-id="resourcesTitle.panelId"
          :tab-id="resourcesTitle.tabId"
          class="flex gap-20 flex-wrap"
        >
          <ProjectResources
            :key="project.id"
            :project="project"
            :as-profile="asProfile"
          />
        </DsfrTabContent>

        <DsfrTabContent
          :panel-id="servicesTitle.panelId"
          :tab-id="servicesTitle.tabId"
        >
          <ServicesConfig
            :key="project.id"
            :project="project"
            :permission-target="asProfile"
            :display-global="asProfile !== 'admin'"
            :disabled="asProfile === 'user' && !ProjectAuthorized.Manage({ projectPermissions: project.myPerms })"
          />
        </DsfrTabContent>

        <DsfrTabContent
          :panel-id="teamTitle.panelId"
          :tab-id="teamTitle.tabId"
        >
          <TeamCt
            :key="project.id + teamId"
            :user-profile="userStore.userProfile"
            :project="project"
            :members="project.members"
            :can-manage="asProfile === 'admin' || ProjectAuthorized.ManageMembers({ projectPermissions: project.myPerms })"
            :can-transfer="asProfile === 'admin' || project.ownerId === userStore.userProfile?.id"
            @refresh="refreshMembers"
            @leave="leaveProject"
          />
        </DsfrTabContent>

        <DsfrTabContent
          :panel-id="rolesTitle.panelId"
          :tab-id="rolesTitle.tabId"
        >
          <div>
            <template
              v-if="asProfile === 'admin' || ProjectAuthorized.ManageRoles({ projectPermissions: project.myPerms })"
            >
              <ProjectRoles
                :key="project.id"
                :project="project"
              />
            </template>
            <p
              v-else
              data-testid="insuficientPermsRoles"
            >
              Vous n'avez pas les permissions pour afficher ces ressources
            </p>
          </div>
        </DsfrTabContent>

        <DsfrTabContent
          :panel-id="logsTitle.panelId"
          :tab-id="logsTitle.tabId"
        >
          <ProjectLogsViewer
            :key="project.id"
            :project="project"
            :as-profile="asProfile"
          />
        </DsfrTabContent>
        <DsfrTabContent
          :panel-id="clustersTitle.panelId"
          :tab-id="clustersTitle.tabId"
        >
          <ProjectClustersInfos
            :key="project.id"
            :project="project"
          />
        </DsfrTabContent>
        <DsfrTabContent
          :panel-id="configurationTitle.panelId"
          :tab-id="configurationTitle.tabId"
        >
          <ProjectSettings :project="project" />
          <DsfrButton
            label="Sauvegarder la configuration"
            data-testid="saveProjectBtn"
            primary
            class="fr-mt-2w"
            :disabled="saveProjectState.isProcessing"
            :icon="saveProjectState.isProcessing
              ? { name: 'ri:refresh-line', animation: 'spin' }
              : 'ri:send-plane-line'"
            @click="saveProject()"
          />
        </DsfrTabContent>
      </DsfrTabs>
      <OperationPanel
        :project="project"
      />
    </div>
  </template>
</template>
