<script lang="ts" setup>
import { onBeforeMount, ref, type Ref } from 'vue'
import { useAdminProjectStore } from '@/stores/admin/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { formatDate, statusDict, sortArrByObjKeyAsc } from '@dso-console/shared'
import { useAdminOrganizationStore } from '@/stores/admin/organization.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import { DsfrInputGroup, getRandomId } from '@gouvminint/vue-dsfr'
import LoadingCt from '@/components/LoadingCt.vue'
import TeamCt from '@/components/TeamCt.vue'
import { useUserStore } from '@/stores/user.js'
import { useProjectUserStore } from '@/stores/project-user'
import { useAdminQuotaStore } from '@/stores/admin/quota'
import { type AsyncReturnType } from '@dso-console/shared'

const adminProjectStore = useAdminProjectStore()
const adminOrganizationStore = useAdminOrganizationStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()
const projectUserStore = useProjectUserStore()
const adminQuotaStore = useAdminQuotaStore()
const projectEnvironmentStore = useProjectEnvironmentStore()

type Component = {
  component: string
  [x: string]: any
}
type Row = {
  status: string
  locked: boolean
  rowData: Array<string | Component>
  rowAttrs: { class: string, title: string, onClick: () => void}
}
type EmptyRow = [[{ text: string; cellAttrs: { colspan: number } }]]
type Rows = Row[]

type EnvironnementRow = [string, string, Component, Component, Component] | [[{ text: string; cellAttrs: { colspan: number } }]]
type EnvironnementRows = EnvironnementRow[] | EmptyRow

type RepositoryRow = [string, Component, Component] | [[{ text: string; cellAttrs: { colspan: number } }]]
type RepositoryRows = RepositoryRow[] | EmptyRow

const allProjects: Ref<AsyncReturnType<typeof adminProjectStore.getAllProjects>> = ref([])
const organizations: Ref<AsyncReturnType<typeof adminOrganizationStore.getAllOrganizations>> = ref([])
const rows: Ref<Rows> = ref([])
const environmentsRows: Ref<EnvironnementRows > = ref([])
const repositoriesRows: Ref<RepositoryRows> = ref([])
const tableKey = ref(getRandomId('table'))
const selectedProject: Ref<typeof allProjects['value'][0] | undefined> = ref()
const isWaitingForResponse = ref(false)
const teamCtKey = ref(getRandomId('team'))
const environmentsCtKey = ref(getRandomId('environment'))
const repositoriesCtKey = ref(getRandomId('repository'))
const isArchivingProject = ref(false)
const projectToArchive = ref('')

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

type FilterMethods = Record<string, (row: Row) => boolean>
const filterMethods: FilterMethods = {
  Tout: () => true,
  'Non archivés': (row) => row.status !== 'archived',
  Archivés: (row) => row.status === 'archived',
  Échoués: (row) => row.status === 'failed',
  Verrouillés: (row) => row.locked,
}
const activeFilter = ref('Non archivés')

const inputSearchText = ref('')

const rowFilter = (rows: Row[]): Rows | EmptyRow => {
  const returnRows = rows.filter(row => {
    if (!filterMethods[activeFilter.value](row)) return false
    if (!inputSearchText.value) return true
    return row.rowData.some(data => {
      try {
        return data.toString().toLowerCase().includes(inputSearchText.value.toLocaleLowerCase())
      } catch (error) {
        console.log(error)
        return false
      }
    })
  })
  if (!returnRows.length) {
    return [[{
      text: 'Aucun projet existant',
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
          roles?.find(role => role.role === 'owner')?.user?.email,
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
      ?.map(({ id, quotaStage, name, status }) => (
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
            'onUpdate:model-value': (event) => updateEnvironmentQuota({ environmentId: id, quotaId: event }),
          },
          {
            component: 'v-icon',
            name: statusDict.status[status].icon,
            title: `L'environnement ${name} est ${statusDict.status[status].wording}`,
            disabled: true,
            fill: statusDict.status[status].color,
          },
          {
            component: 'v-icon',
            name: 'ri-refresh-fill',
            // title: `Reprovisionner l'environnement ${name}`,
            title: 'Cette fonctionnalité n\'est pas encore disponible',
            cursor: 'pointer',
            fill: 'var(--warning-425-625)',
            class: 'cursor-not-allowed',
            onClick: () => replayHooks({ resource: 'environment', resourceId: id }),
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
      ?.map(({ id, internalRepoName, status }) => (
        [
          internalRepoName,
          {
            component: 'v-icon',
            name: statusDict.status[status].icon,
            title: `Le dépôt ${internalRepoName} est ${statusDict.status[status].wording}`,
            fill: statusDict.status[status].color,
          },
          {
            component: 'v-icon',
            name: 'ri-refresh-fill',
            // title: `Reprovisionner le dépôt ${internalRepoName}`,
            title: 'Cette fonctionnalité n\'est pas encore disponible',
            cursor: 'pointer',
            fill: 'var(--warning-425-625)',
            class: 'cursor-not-allowed',
            onClick: () => replayHooks({ resource: 'repository', resourceId: id }),
          },
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
  isWaitingForResponse.value = true
  try {
    allProjects.value = await adminProjectStore.getAllProjects()
    setRows()
    if (selectedProject.value) selectProject(selectedProject.value.id)
  } catch (error) {
    if (error instanceof Error) snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

const selectProject = async (projectId: string) => {
  selectedProject.value = allProjects.value?.find(project => project.id === projectId)
  getRepositoriesRows()
  await getEnvironmentsRows()
}

const updateEnvironmentQuota = async ({ environmentId, quotaId }: {environmentId: string, quotaId: string}) => {
  if (!selectedProject.value) return
  isWaitingForResponse.value = true
  try {
    const environment = selectedProject.value?.environments.find(environment => environment.id === environmentId)
    environment.quotaStageId = environment.quotaStage.stage.quotaStage.find(quotaStage => quotaStage.quotaId === quotaId)?.id
    await projectEnvironmentStore.updateEnvironment(environment, selectedProject.value.id)
    await getAllProjects()
  } catch (error) {
    if (error instanceof Error) snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

const handleProjectLocking = async (projectId: string, lock: boolean) => {
  isWaitingForResponse.value = true
  try {
    await adminProjectStore.handleProjectLocking(projectId, lock)
    await getAllProjects()
  } catch (error) {
    if (error instanceof Error) snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

const replayHooks = async ({ resource, resourceId }: {resource: string, resourceId: string}) => {
  isWaitingForResponse.value = true
  try {
    // snackbarStore.setMessage(`Reprovisionnement de la ressource ${resource} ayant pour id ${resourceId}`)
    console.log({ resource, resourceId })
    snackbarStore.setMessage('Cette fonctionnalité n\'est pas encore disponible.')
  } catch (error) {
    if (error instanceof Error) snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

const archiveProject = async (projectId: string) => {
  if (!selectedProject.value) return
  isWaitingForResponse.value = true
  try {
    await adminProjectStore.archiveProject(projectId)
    await getAllProjects()
    selectedProject.value = undefined
  } catch (error) {
    if (error instanceof Error) snackbarStore.setMessage(error?.message, 'error')
  }
  isWaitingForResponse.value = false
}

const addUserToProject = async (email: string) => {
  isWaitingForResponse.value = true
  try {
    await projectUserStore.addUserToProject(selectedProject.value?.id, { email })
    await getAllProjects()
    teamCtKey.value = getRandomId('team')
  } catch (error) {
    if (error instanceof Error) {
      snackbarStore.setMessage(error.message)
    } else {
      snackbarStore.setMessage('échec d\'ajout de l\'utilisateur au projet')
    }
  }
  isWaitingForResponse.value = false
}

const updateUserRole = ({ userId, role }: { userId: string, role: string }) => {
  console.log({ userId, role })
  snackbarStore.setMessage('Cette fonctionnalité n\'est pas encore disponible')
}

const removeUserFromProject = async (userId: string) => {
  if (!selectedProject.value) return
  isWaitingForResponse.value = true
  try {
    if (selectedProject.value.id) await projectUserStore.removeUserFromProject(selectedProject.value.id, userId)
    await getAllProjects()
    teamCtKey.value = getRandomId('team')
  } catch (error) {
    if (error instanceof Error) {
      snackbarStore.setMessage(error.message)
    } else {
      snackbarStore.setMessage('échec de retrait de l\'utilisateur du projet')
    }
  }
  isWaitingForResponse.value = false
}

onBeforeMount(async () => {
  organizations.value = await adminOrganizationStore.getAllOrganizations()
  await getAllProjects()
})

</script>
<template>
  <div
    class="relative"
  >
    <div class="w-full flex gap-4 justify-end fr-mb-1w">
      <DsfrButton
        v-if="!selectedProject"
        data-testid="refresh-btn"
        title="Rafraîchir la liste des projets"
        secondary
        icon-only
        icon="ri-refresh-fill"
        :disabled="!!isWaitingForResponse"
        @click="async() => {
          await getAllProjects()
        }"
      />
      <DsfrButton
        v-if="selectedProject"
        title="Revenir à la liste des projets"
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
        label="Filtre rapide"
        :options="Object.keys(filterMethods)"
      />
      <DsfrInputGroup
        v-model="inputSearchText"
        type="inputType"
        label-visible
        placeholder="Recherche plein texte"
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
        :content="selectedProject.description"
      />
      <div class="w-full flex gap-4 fr-mb-2w">
        <DsfrButton
          label="Reprovisionner le projet"
          title="Cette fonctionnalité n'est pas encore disponible"
          icon="ri-refresh-fill"
          secondary
          disabled
          @click="replayHooks({resource: 'project', resourceId: selectedProject.id})"
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
          label="Archiver le projet"
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
            :label="`Archiver définitivement le projet ${selectedProject.name}`"
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
            text: '#Environnements du projet'
          },
          {
            to: `#${repositoriesId}`,
            text: '#Dépôts du projet'
          },
          {
            to: `#${membersId}`,
            text: '#Membres du projet'
          },
        ]"
      />
      <div
        class="w-full flex flex-col gap-8"
      >
        <DsfrTable
          :id="environmentsId"
          :key="environmentsCtKey"
          :title="`Environnements du projet ${selectedProject.name}`"
          :headers="['Nom', 'Stage', 'Quota', 'Statut', 'Reprovisionner']"
          :rows="environmentsRows"
        />
        <DsfrTable
          :id="repositoriesId"
          :key="repositoriesCtKey"
          :title="`Dépôts du projet ${selectedProject.name}`"
          :headers="['Nom', 'Statut', 'Reprovisionner']"
          :rows="repositoriesRows"
        />
        <TeamCt
          :id="membersId"
          :key="teamCtKey"
          :user-profile="userStore.userProfile"
          :project="{id: selectedProject.id, name: selectedProject.name, roles: selectedProject?.roles }"
          :owner="selectedProject.roles?.find(role => role.role === 'owner').user"
          :is-updating-project-members="isWaitingForResponse"
          @add-member="(email) => addUserToProject(email)"
          @update-role="({ userId, role}) => updateUserRole({ userId, role})"
          @remove-member="(userId) => removeUserFromProject(userId)"
        />
      </div>
    </div>
    <LoadingCt
      v-if="isWaitingForResponse"
      description="Opérations en cours"
    />
  </div>
</template>
