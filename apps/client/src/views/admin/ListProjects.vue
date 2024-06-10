<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import { getRandomId } from '@gouvminint/vue-dsfr'
import { type AsyncReturnType, type PluginsUpdateBody, formatDate, statusDict, sortArrByObjKeyAsc, AllStatus, type Project, type ProjectService } from '@cpn-console/shared'
import { useAdminProjectStore } from '@/stores/admin/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useAdminOrganizationStore } from '@/stores/admin/organization.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import { useUserStore } from '@/stores/user.js'
import { useUsersStore } from '@/stores/users.js'
import { useProjectUserStore } from '@/stores/project-user.js'
import { useAdminQuotaStore } from '@/stores/admin/quota.js'
import { useProjectServiceStore } from '@/stores/project-services.js'

const adminProjectStore = useAdminProjectStore()
const adminOrganizationStore = useAdminOrganizationStore()
const projectServiceStore = useProjectServiceStore()
const userStore = useUserStore()
const usersStore = useUsersStore()
const snackbarStore = useSnackbarStore()
const projectUserStore = useProjectUserStore()
const adminQuotaStore = useAdminQuotaStore()
const projectEnvironmentStore = useProjectEnvironmentStore()

export type Component = {
  component: string
  [x: string]: any
}
type Row = {
  status: string
  locked: boolean
  rowData: Array<string | Component>
  rowAttrs: { class: string, title: string, onClick: () => void}
}
export type EmptyRow = [[{ text: string; cellAttrs: { colspan: number } }]]
type Rows = Row[]

type EnvironnementRow = [string, string, Component, Component, Component] | [[{ text: string; cellAttrs: { colspan: number } }]]
type EnvironnementRows = EnvironnementRow[] | EmptyRow

type RepositoryRow = [string, Component, Component] | [[{ text: string; cellAttrs: { colspan: number } }]]
type RepositoryRows = RepositoryRow[] | EmptyRow

type FileForDownload = File & {
  href?: string,
  format?: string,
  title?: string,
}

const allProjects = ref<AsyncReturnType<typeof adminProjectStore.getAllProjects>>([])
const organizations = ref<AsyncReturnType<typeof adminOrganizationStore.getAllOrganizations>>([])
const rows = ref<Rows>([])
const environmentsRows = ref<EnvironnementRows>([])
const repositoriesRows = ref<RepositoryRows>([])
const tableKey = ref(getRandomId('table'))
const selectedProject = ref<Project | undefined>(undefined)
const teamCtKey = ref(getRandomId('team'))
const environmentsCtKey = ref(getRandomId('environment'))
const repositoriesCtKey = ref(getRandomId('repository'))
const isArchivingProject = ref(false)
const projectToArchive = ref('')
const inputSearchText = ref('')
const activeFilter = ref('Non archivés')
const file = ref<FileForDownload | undefined>(undefined)

const title = 'Liste des projets'
const headers = [
  'Organisation',
  'Nom',
  'Description',
  'Souscripteur',
  'Status',
  'Verrouillage',
  'Création',
  'Modification',
]
const membersId = 'membersTable'
const repositoriesId = 'repositoriesTable'
const environmentsId = 'environmentsTable'
const servicesId = 'servicesTable'

type FilterMethods = Record<string, (row: Row) => boolean>
const filterMethods: FilterMethods = {
  Tous: () => true,
  'Non archivés': (row) => row.status !== 'archived',
  Archivés: (row) => row.status === 'archived',
  Échoués: (row) => row.status === AllStatus.FAILED,
  Vérrouillés: (row) => row.locked,
}

const rowFilter = (rows: Row[]): Rows | EmptyRow => {
  const returnRows = rows.filter(row => {
    if (!filterMethods[activeFilter.value](row)) return false
    if (!inputSearchText.value) return true
    return row.rowData.some(data => {
      if (typeof data === 'object') {
        return data.text?.toString().toLowerCase().includes(inputSearchText.value.toLocaleLowerCase())
      }
      return data.toString().toLowerCase().includes(inputSearchText.value.toLocaleLowerCase())
    })
  })
  if (!returnRows.length) {
    return [[{
      text: 'Aucun projet trouvé',
      cellAttrs: {
        colspan: headers.length,
      },
    }]]
  }
  return returnRows
}

const setRows = () => {
  rows.value = sortArrByObjKeyAsc(allProjects.value, 'name')
    ?.map(({ id, organizationId, name, description, roles, status, locked, createdAt, updatedAt }) => (
      {
        status,
        locked,
        rowAttrs: {
          onClick: () => {
            if (status === 'archived') return snackbarStore.setMessage('Le projet est archivé, pas d\'action possible', 'info')
            selectProject(id)
          },
          class: 'cursor-pointer',
          title: `Voir le tableau de bord du projet ${name}`,
        },
        rowData: [
          organizations.value?.find(org => org.id === organizationId)?.label,
          name,
          description ?? '',
          roles.find(role => role.role === 'owner')?.user?.email ?? '',
          {
            component: 'v-icon',
            name: statusDict.status[status].icon,
            title: `Le projet ${name} est ${statusDict.status[status].wording}`,
            fill: statusDict.status[status].color,
          },
          {
            component: 'v-icon',
            name: statusDict.locked[locked].icon,
            title: `Le projet ${name} est ${statusDict.locked[locked].wording}`,
            fill: statusDict.locked[locked].color,
          },
          formatDate(createdAt),
          formatDate(updatedAt),
        ],
      }),
    )
  tableKey.value = getRandomId('table')
}

const getEnvironmentsRows = async () => {
  if (!selectedProject.value) return
  await adminQuotaStore.getAllQuotas()
  environmentsRows.value = selectedProject.value.environments?.length
    ? sortArrByObjKeyAsc(selectedProject.value.environments, 'name')
      ?.map(({ id, quotaStage, name }) => (
        [
          name,
          quotaStage.stage.name,
          {
            component: 'DsfrSelect',
            modelValue: quotaStage.quota.id,
            selectId: 'quota-select',
            options: quotaStage.stage.quotaStage
              ?.reduce((acc, curr) => {
                const matchingQuota = adminQuotaStore.quotas
                  ?.find(quota => quota.id === curr.quotaId)
                return matchingQuota
                  ? [...acc, {
                      text: matchingQuota.name + ' (' + matchingQuota.cpu + 'CPU, ' + matchingQuota.memory + ')',
                      value: matchingQuota.id,
                    }]
                  : acc
              }, []),
            'onUpdate:model-value': (event: string) => updateEnvironmentQuota({ environmentId: id, quotaId: event }),
          },
        ]
      ),
      )
    : [[{
        text: 'Aucun environnement existant',
        cellAttrs: {
          colspan: headers.length,
        },
      }]]
  environmentsCtKey.value = getRandomId('environment')
}

const getRepositoriesRows = () => {
  if (!selectedProject.value) return
  repositoriesRows.value = selectedProject.value.repositories?.length
    ? sortArrByObjKeyAsc(selectedProject.value.repositories, 'internalRepoName')
      ?.map(({ internalRepoName, isInfra }) => (
        [
          internalRepoName,
          isInfra ? 'Infra' : 'Applicatif',
        ]
      ),
      )
    : [[{
        text: 'Aucun dépôt existant',
        cellAttrs: {
          colspan: headers.length,
        },
      }]]
  repositoriesCtKey.value = getRandomId('repository')
}

const getAllProjects = async () => {
  snackbarStore.isWaitingForResponse = true
  allProjects.value = await adminProjectStore.getAllProjects()
  setRows()
  if (selectedProject.value) selectProject(selectedProject.value.id)
  snackbarStore.isWaitingForResponse = false
}

const selectProject = async (projectId: string) => {
  selectedProject.value = allProjects.value?.find(project => project.id === projectId)
  getRepositoriesRows()
  await getEnvironmentsRows()
  reloadProjectServices()
}

const updateEnvironmentQuota = async ({ environmentId, quotaId }: {environmentId: string, quotaId: string}) => {
  if (!selectedProject.value?.environments) return
  snackbarStore.isWaitingForResponse = true
  const environment = selectedProject.value.environments.find(environment => environment.id === environmentId)
  if (!environment) return
  environment.quotaStageId = environment.quotaStage.stage?.quotaStage?.find(quotaStage => quotaStage.quotaId === quotaId)?.id ?? ''
  await projectEnvironmentStore.updateEnvironment(environment, selectedProject.value.id)
  await getAllProjects()
  snackbarStore.isWaitingForResponse = false
}

const handleProjectLocking = async (projectId: string, lock: boolean) => {
  snackbarStore.isWaitingForResponse = true
  await adminProjectStore.handleProjectLocking(projectId, lock)
  await getAllProjects()
  snackbarStore.isWaitingForResponse = false
}

const replayHooks = async (projectId: string) => {
  snackbarStore.isWaitingForResponse = true
  await adminProjectStore.replayHooksForProject(projectId)
  await getAllProjects()
  snackbarStore.setMessage(`Le projet ayant pour id ${projectId} a été reprovisionné avec succès`, 'success')
  snackbarStore.isWaitingForResponse = false
}

const archiveProject = async (projectId: string) => {
  if (!selectedProject.value) return
  snackbarStore.isWaitingForResponse = true
  await adminProjectStore.archiveProject(projectId)
  await getAllProjects()
  selectedProject.value = undefined
  snackbarStore.isWaitingForResponse = false
}

const addUserToProject = async (email: string) => {
  snackbarStore.isWaitingForResponse = true
  if (selectedProject.value) {
    const newRoles = await projectUserStore.addUserToProject(selectedProject.value.id, { email })
    selectedProject.value.roles = newRoles
  }
  teamCtKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

const updateUserRole = ({ userId, role }: { userId: string, role: string }) => {
  console.log({ userId, role })
  snackbarStore.setMessage('Cette fonctionnalité n\'est pas encore disponible')
}

const removeUserFromProject = async (userId: string) => {
  if (!selectedProject.value) return
  snackbarStore.isWaitingForResponse = true
  if (selectedProject.value.id) {
    const newRoles = await projectUserStore.removeUserFromProject(selectedProject.value.id, userId)
    selectedProject.value.roles = newRoles
  }
  teamCtKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

const generateProjectsDataFile = async () => {
  file.value = new File([await adminProjectStore.generateProjectsData()], 'dso-projects.csv', {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(file.value)

  file.value = {
    ...file.value,
    href: url,
    size: `${file.value.size} bytes`,
    format: 'CSV',
    title: 'dso-projects.csv',
  }
}

onBeforeMount(async () => {
  organizations.value = await adminOrganizationStore.getAllOrganizations()
  await getAllProjects()
})

const projectServices = ref<ProjectService[]>([])
const reloadProjectServices = async () => {
  if (!selectedProject.value) return
  const resServices = await projectServiceStore.getProjectServices(selectedProject.value.id, 'admin')
  projectServices.value = []
  await nextTick()
  const filteredServices = resServices
  projectServices.value = filteredServices
}

const saveProjectServices = async (data: PluginsUpdateBody) => {
  if (!selectedProject.value) return

  snackbarStore.isWaitingForResponse = true
  try {
    await projectServiceStore.updateProjectServices(data, selectedProject.value.id)
    snackbarStore.setMessage('Paramètres sauvegardés', 'success')
  } catch (error) {
    console.log(error)

    snackbarStore.setMessage('Erreur lors de la sauvegarde', 'error')
  }
  await reloadProjectServices()
  snackbarStore.isWaitingForResponse = false
}
</script>
<template>
  <div
    class="relative"
  >
    <div class="w-full flex gap-4 justify-end fr-mb-1w">
      <DsfrButton
        v-if="!selectedProject && !file"
        data-testid="download-btn"
        title="Exporter les données de tous les projets"
        secondary
        icon-only
        icon="ri-file-download-line"
        :disabled="snackbarStore.isWaitingForResponse"
        @click="generateProjectsDataFile()"
      />
      <DsfrFileDownload
        v-if="!selectedProject && file"
        :format="file.format"
        :size="file.size"
        :href="file.href"
        :title="file.title"
        :download="file.title"
      />
      <DsfrButton
        data-testid="refresh-btn"
        title="Rafraîchir la liste des projets"
        secondary
        icon-only
        icon="ri-refresh-fill"
        :disabled="snackbarStore.isWaitingForResponse"
        @click="async() => {
          await getAllProjects()
        }"
      />
      <DsfrButton
        v-if="selectedProject"
        title="Revenir à la liste des projets"
        data-testid="goBackBtn"
        secondary
        icon-only
        icon="ri-arrow-go-back-line"
        @click="() => selectedProject = undefined"
      />
    </div>
    <div
      v-if="!selectedProject"
      class="flex"
    >
      <DsfrSelect
        v-model="activeFilter"
        select-id="tableAdministrationProjectsFilter"
        label="Filtre rapide"
        :options="Object.keys(filterMethods)"
      />
      <DsfrInputGroup
        v-model="inputSearchText"
        data-testid="tableAdministrationProjectsSearch"
        label-visible
        placeholder="Recherche textuelle"
        label="Recherche"
        class="flex-1 pl-4"
      />
    </div>
    <DsfrTable
      v-if="!selectedProject"
      :key="tableKey"
      data-testid="tableAdministrationProjects"
      :title="title"
      :headers="headers"
      :rows="rowFilter(rows)"
    />
    <div v-if="selectedProject">
      <DsfrCallout
        :title="selectedProject.name"
        :content="selectedProject.description ?? ''"
      />
      <div class="w-full flex gap-4 fr-mb-2w">
        <DsfrButton
          data-testid="replayHooksBtn"
          label="Reprovisionner le projet"
          icon="ri-refresh-fill"
          secondary
          @click="replayHooks(selectedProject.id)"
        />
        <DsfrButton
          data-testid="handleProjectLockingBtn"
          :label="`${selectedProject.locked ? 'Déverrouiller': 'Verrouiller'} le projet`"
          :icon="selectedProject.locked ? 'ri-lock-unlock-fill': 'ri-lock-fill'"
          secondary
          @click="handleProjectLocking(selectedProject.id, !selectedProject.locked)"
        />
        <DsfrButton
          v-show="!isArchivingProject"
          data-testid="showArchiveProjectBtn"
          label="Supprimer le projet"
          secondary
          icon="ri-delete-bin-7-line"
          @click="isArchivingProject = true"
        />
      </div>
      <div
        v-if="isArchivingProject"
        class="fr-mt-4w"
      >
        <DsfrInput
          v-model="projectToArchive"
          data-testid="archiveProjectInput"
          :label="`Veuillez taper '${selectedProject?.name}' pour confirmer l'archivage du projet`"
          label-visible
          :placeholder="selectedProject.name"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            data-testid="archiveProjectBtn"
            :label="`Supprimer définitivement le projet ${selectedProject.name}`"
            :disabled="projectToArchive !== selectedProject.name"
            secondary
            icon="ri-delete-bin-7-line"
            @click="archiveProject(selectedProject.id)"
          />
          <DsfrButton
            label="Annuler"
            primary
            @click="isArchivingProject = false"
          />
        </div>
      </div>
      <DsfrNavigation
        class="fr-mb-2w"
        :nav-items="[
          {
            to: `#${environmentsId}`,
            text: '#Environnements'
          },
          {
            to: `#${repositoriesId}`,
            text: '#Dépôts'
          },
          {
            to: `#${membersId}`,
            text: '#Membres'
          },
          {
            to: `#${servicesId}`,
            text: '#Services'
          },
        ]"
      />
      <div
        class="w-full flex flex-col gap-8"
      >
        <DsfrTable
          :id="environmentsId"
          :key="environmentsCtKey"
          title="Environnements"
          :headers="['Nom', 'Type d\'environnement', 'Quota']"
          :rows="environmentsRows"
        />
        <DsfrTable
          :id="repositoriesId"
          :key="repositoriesCtKey"
          title="Dépôts"
          :headers="['Nom', 'Type']"
          :rows="repositoriesRows"
        />
        <TeamCt
          :id="membersId"
          :key="teamCtKey"
          :user-profile="userStore.userProfile"
          :project="{id: selectedProject.id, name: selectedProject.name, locked: selectedProject.locked }"
          :roles="selectedProject.roles?.map(({user, ...role}) => role) ?? []"
          :known-users="usersStore.users"
          @add-member="(email) => addUserToProject(email)"
          @update-role="({ userId, role}) => updateUserRole({ userId, role})"
          @remove-member="(userId) => removeUserFromProject(userId)"
        />
        <div>
          <h4
            :id="servicesId"
            class="mb-0"
          >
            Services
          </h4>
          <ServicesConfig
            :services="projectServices"
            permission-target="admin"
            :display-global="false"
            @update="(data: PluginsUpdateBody) => saveProjectServices(data)"
            @reload="() => reloadProjectServices()"
          />
        </div>
      </div>
    </div>
    <LoadingCt
      v-if="snackbarStore.isWaitingForResponse"
      description="Opérations en cours"
    />
  </div>
</template>
