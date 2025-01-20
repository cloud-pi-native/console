<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import { ProjectAuthorized } from '@cpn-console/shared'
import type { ProjectV2 } from '@cpn-console/shared'
import { useUserStore } from '@/stores/user.js'
import { useQuotaStore } from '@/stores/quota.js'
import { useProjectStore } from '@/stores/project.js'
import { useStageStore } from '@/stores/stage.js'
import router from '@/router/index.js'
import { useClusterStore } from '@/stores/cluster.js'
import { useZoneStore } from '@/stores/zone.js'
import OperationPanel from '@/components/OperationPanel.vue'
import { getRandomId } from '@gouvminint/vue-dsfr'

const props = defineProps<{
  projectSlug: ProjectV2['slug']
  parentRoute: string
  asProfile: 'user' | 'admin'
}>()

const projectStore = useProjectStore()
const zoneStore = useZoneStore()
const clusterStore = useClusterStore()
const userStore = useUserStore()
const quotaStore = useQuotaStore()
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
    quotaStore.getAllQuotas(),
    clusterStore.getClusters(),
    zoneStore.getAllZones(),
  ])
})

// LOGS Rendering functions
const tabListName = 'Liste d’onglet'
const resourcesTitle = { title: 'Ressources', icon: 'ri:shapes-line', tabId: 'tab-resources', panelId: 'tab-resources' }
const servicesTitle = { title: 'Services externes', icon: 'ri:flow-chart', tabId: 'tab-services', panelId: 'tab-services' }
const teamTitle = { title: 'Équipe', icon: 'ri:team-line', tabId: 'tab-team', panelId: 'tab-team' }
const rolesTitle = { title: 'Rôles', icon: 'ri:admin-line', tabId: 'tab-roles', panelId: 'tab-roles' }
const logsTitle = { title: 'Journaux', icon: 'ri:newspaper-line', tabId: 'tab-logs', panelId: 'tab-logs' }
const tabTitles = [
  resourcesTitle,
  servicesTitle,
  teamTitle,
  rolesTitle,
  logsTitle,
]

const activeTab = ref(0)

async function refreshMembers() {
  await project.value.Members.list()
  teamId.value = getRandomId('team')
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
        :project="project"
        :can-edit-description="asProfile === 'user' && ProjectAuthorized.Manage({ projectPermissions: project.myPerms })"
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
          panel-id="tab-resources"
          tab-id="tab-resources"
          class="flex gap-20 flex-wrap"
        >
          <ProjectResources
            :key="project.id"
            :project="project"
            :as-profile="asProfile"
          />
        </DsfrTabContent>

        <DsfrTabContent
          panel-id="tab-services"
          tab-id="tab-services"
        >
          <ServicesConfig
            :key="project.id"
            :project="project"
            :permission-target="asProfile"
            :display-global="true"
            :disabled="asProfile === 'user' && !ProjectAuthorized.Manage({ projectPermissions: project.myPerms })"
          />
        </DsfrTabContent>

        <DsfrTabContent
          panel-id="tab-team"
          tab-id="tab-team"
        >
          <TeamCt
            :key="project.id + teamId"
            :user-profile="userStore.userProfile"
            :project="project"
            :members="project.members"
            :can-manage="asProfile === 'admin' || ProjectAuthorized.ManageMembers({ projectPermissions: project.myPerms })"
            :can-transfer="asProfile === 'admin' || ProjectAuthorized.Manage({ projectPermissions: project.myPerms })"
            @refresh="refreshMembers"
          />
        </DsfrTabContent>

        <DsfrTabContent
          panel-id="tab-roles"
          tab-id="tab-roles"
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
            >
              Vous n'avez pas les permissions pour afficher ces ressources
            </p>
          </div>
        </DsfrTabContent>

        <DsfrTabContent
          panel-id="tab-logs"
          tab-id="tab-logs"
        >
          <ProjectLogsViewer
            :key="project.id"
            :project="project"
            :as-profile="asProfile"
          />
        </DsfrTabContent>
      </DsfrTabs>
      <OperationPanel
        :project="project"
      />
    </div>
  </template>
</template>
