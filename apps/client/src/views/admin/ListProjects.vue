<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import type { Environment, Organization, PluginsUpdateBody, ProjectService, ProjectV2, Repo, projectContract } from '@cpn-console/shared'
import { formatDate, sortArrByObjKeyAsc, statusDict } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useOrganizationStore } from '@/stores/organization.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import { useUserStore } from '@/stores/user.js'
import { useQuotaStore } from '@/stores/quota.js'
import { useProjectServiceStore } from '@/stores/project-services.js'
import { useProjectRepositoryStore } from '@/stores/project-repository.js'
import { useProjectStore } from '@/stores/project.js'
import { useStageStore } from '@/stores/stage.js'
import { useProjectMemberStore } from '@/stores/project-member.js'
import { bts, truncateDescription } from '@/utils/func.js'

const projectStore = useProjectStore()
const organizationStore = useOrganizationStore()
const projectServiceStore = useProjectServiceStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()
const quotaStore = useQuotaStore()
const stageStore = useStageStore()
const projectMemberStore = useProjectMemberStore()
const projectRepositoryStore = useProjectRepositoryStore()
const projectEnvironmentStore = useProjectEnvironmentStore()

type FileForDownload = File & {
  href?: string
  format?: string
  title?: string
}

const organizations = ref<Organization[]>([])
const tableKey = ref(getRandomId('table'))
const selectedProject = ref<ProjectV2 & { repositories: Repo[], environments: Environment[] }>()
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

type FilterMethods = Record<string, typeof projectContract.listProjects.query._type>
const filterMethods: FilterMethods = {
  Tous: { filter: 'all' },
  'Non archivés': { filter: 'all', statusNotIn: 'archived' },
  Archivés: { filter: 'all', statusIn: 'archived' },
  Échoués: { filter: 'all', statusIn: 'failed' },
  Vérrouillés: { filter: 'all', locked: true, statusNotIn: 'archived' },
}

interface DomElement extends Event {
  target: HTMLElement & {
    open?: string
  }
}

const projectRows = computed(() => {
  let rows = sortArrByObjKeyAsc(projectStore.projects, 'name')
    ?.map(({ id, organization, name, description, status, locked, createdAt, updatedAt, owner }) => (
      {
        status,
        locked,
        rowAttrs: {
          onClick: (event: DomElement) => {
            if (status === 'archived') return snackbarStore.setMessage('Le projet est archivé, pas d\'action possible', 'info')
            if (event.target.id === 'description' && event.target.getAttribute('open') === 'false') return untruncateDescription(event.target)
            selectProject(id)
          },
          class: 'cursor-pointer',
          title: `Voir le tableau de bord du projet ${name}`,
        },
        rowData: [
          organization.label,
          name,
          truncateDescription(description ?? ''),
          owner.email,
          {
            component: 'v-icon',
            name: statusDict.status[status].icon,
            title: `Le projet ${name} est ${statusDict.status[status].wording}`,
            fill: statusDict.status[status].color,
          },
          {
            component: 'v-icon',
            name: statusDict.locked[bts(locked)].icon,
            title: `Le projet ${name} est ${statusDict.locked[bts(locked)].wording}`,
            fill: statusDict.locked[bts(locked)].color,
          },
          formatDate(createdAt),
          formatDate(updatedAt),
        ],
      }),
    )
  if (inputSearchText.value) {
    rows = rows.filter((row) => {
      return row.rowData.some((data) => {
        if (typeof data === 'object') {
          return data.title?.toString().toLowerCase().includes(inputSearchText.value.toLocaleLowerCase())
        }
        return data.toString().toLowerCase().includes(inputSearchText.value.toLocaleLowerCase())
      })
    })
  }
  if (!rows.length) {
    return [[{
      field: 'string',
      text: 'Aucun projet trouvé',
      cellAttrs: {
        colspan: headers.length,
      },
    }]]
  }
  return rows
})
const envRows = computed(() => {
  if (!selectedProject.value) return []
  if (!selectedProject.value.environments.length) {
    return [[{
      text: 'Aucun environnement existant',
      cellAttrs: {
        colspan: headers.length,
      },
    }]]
  }
  return sortArrByObjKeyAsc(selectedProject.value.environments, 'name')
    ?.map(({ id, name, quotaId, stageId }) => (
      [
        name,
        stageStore.stages.find(stage => stage.id === stageId)?.name,
        {
          component: 'DsfrSelect',
          modelValue: quotaId,
          selectId: 'quota-select',
          options: quotaStore.quotas.filter(quota => quota.stageIds.includes(stageId)).map(quota => ({
            text: `${quota.name} (${quota.cpu}CPU, ${quota.memory})`,
            value: quota.id,
          })),
          'onUpdate:model-value': (event: string) => updateEnvironmentQuota({ environmentId: id, quotaId: event }),
        },
      ]
    ),
    )
})

const repoRows = computed(() => {
  if (!selectedProject.value) return []
  if (!selectedProject.value.repositories.length) {
    return [[{
      text: 'Aucun dépôt existant',
      cellAttrs: {
        colspan: headers.length,
      },
    }]]
  }
  return sortArrByObjKeyAsc(selectedProject.value.repositories, 'internalRepoName')
    ?.map(({ internalRepoName, isInfra, externalRepoUrl, isPrivate }) => (
      [
        internalRepoName,
        isInfra ? 'Infra' : 'Applicatif',
        isPrivate ? 'oui' : 'non',
        externalRepoUrl,
      ]
    ),
    )
})

async function getAllProjects() {
  snackbarStore.isWaitingForResponse = true
  await projectStore.listProjects(filterMethods[activeFilter.value])
  tableKey.value = getRandomId('table')
  if (selectedProject.value) selectProject(selectedProject.value.id)
  snackbarStore.isWaitingForResponse = false
}

async function selectProject(projectId: string) {
  const project = projectStore.projects.find(project => project.id === projectId)
  if (!project) return
  await Promise.all([
    projectRepositoryStore.getProjectRepositories(projectId),
    projectEnvironmentStore.getProjectEnvironments(projectId),
    reloadProjectServices(projectId),
  ])
  selectedProject.value = {
    ...project,
    environments: projectEnvironmentStore.environments,
    repositories: projectRepositoryStore.repositories,
  }
  environmentsCtKey.value = getRandomId('environment')
  repositoriesCtKey.value = getRandomId('repository')
}

async function updateEnvironmentQuota({ environmentId, quotaId }: { environmentId: string, quotaId: string }) {
  snackbarStore.isWaitingForResponse = true
  const environment = projectEnvironmentStore.environments.find(environment => environment.id === environmentId)
  if (!environment) return
  environment.quotaId = quotaId
  await projectEnvironmentStore.updateEnvironment(environment.id, environment)
  await getAllProjects()
  snackbarStore.isWaitingForResponse = false
}

async function handleProjectLocking(projectId: string, lock: boolean) {
  snackbarStore.isWaitingForResponse = true
  await projectStore.handleProjectLocking(projectId, lock)
  await getAllProjects()
  snackbarStore.isWaitingForResponse = false
}

async function replayHooks(projectId: string) {
  snackbarStore.isWaitingForResponse = true
  await projectStore.replayHooksForProject(projectId)
  await getAllProjects()
  snackbarStore.setMessage(`Le projet ayant pour id ${projectId} a été reprovisionné avec succès`, 'success')
  snackbarStore.isWaitingForResponse = false
}

async function archiveProject(projectId: string) {
  if (!selectedProject.value) return
  snackbarStore.isWaitingForResponse = true
  await projectStore.archiveProject(projectId)
  selectedProject.value = undefined
  await getAllProjects()
  snackbarStore.isWaitingForResponse = false
}

async function addUserToProject(email: string) {
  if (!selectedProject.value) return
  snackbarStore.isWaitingForResponse = true
  selectedProject.value.members = await projectMemberStore.addMember(selectedProject.value.id, email)
  await getAllProjects()
  teamCtKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

async function removeUserFromProject(userId: string) {
  if (!selectedProject.value) return
  snackbarStore.isWaitingForResponse = true
  if (selectedProject.value.id) {
    await projectMemberStore.removeMember(selectedProject.value.id, userId)
    selectedProject.value.members = selectedProject.value.members.filter(user => user.userId !== userId)
  }
  teamCtKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

async function transferOwnerShip(nextOwnerId: string) {
  if (!selectedProject.value) return
  snackbarStore.isWaitingForResponse = true
  const updatedProject = await projectStore.updateProject(selectedProject.value.id, { ownerId: nextOwnerId })
  selectedProject.value = {
    ...selectedProject.value,
    ...updatedProject,
  }
  teamCtKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

async function generateProjectsDataFile() {
  file.value = new File([await projectStore.generateProjectsData()], 'dso-projects.csv', {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(file.value)

  file.value = {
    ...file.value,
    href: url,
    size: file.value.size,
    format: 'CSV',
    title: 'dso-projects.csv',
  }
}

onBeforeMount(async () => {
  organizations.value = await organizationStore.listOrganizations()
  await Promise.all([
    await stageStore.getAllStages(),
    await quotaStore.getAllQuotas(),
    await getAllProjects(),
  ])
})

const projectServices = ref<ProjectService[]>([])
async function reloadProjectServices(projectId: ProjectV2['id']) {
  const resServices = await projectServiceStore.getProjectServices(projectId, 'admin')
  projectServices.value = []
  await nextTick()
  const filteredServices = resServices
  projectServices.value = filteredServices
}

async function saveProjectServices(data: PluginsUpdateBody) {
  if (!selectedProject.value) return

  snackbarStore.isWaitingForResponse = true
  try {
    await projectServiceStore.updateProjectServices(data, selectedProject.value.id)
    snackbarStore.setMessage('Paramètres sauvegardés', 'success')
  } catch (error) {
    console.log(error)

    snackbarStore.setMessage('Erreur lors de la sauvegarde', 'error')
  }
  await reloadProjectServices(selectedProject.value.id)
  snackbarStore.isWaitingForResponse = false
}

function untruncateDescription(span: HTMLElement) {
  span.innerHTML = span.title

  span.setAttribute('open', 'true')
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
        :size="`${file.size} bytes`"
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
    <template
      v-if="!selectedProject"
    >
      <div
        class="flex"
      >
        <DsfrSelect
          v-model="activeFilter"
          select-id="tableAdministrationProjectsFilter"
          label="Filtre rapide"
          :options="Object.keys(filterMethods)"
          @update:model-value="getAllProjects()"
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
        :key="tableKey"
        data-testid="tableAdministrationProjects"
        :title="title"
        :headers="headers"
        :rows="projectRows"
      />
    </template>
    <div v-else>
      <DsfrCallout
        :title="selectedProject.name"
        :content="selectedProject.description"
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
          :label="`${selectedProject.locked ? 'Déverrouiller' : 'Verrouiller'} le projet`"
          :icon="selectedProject.locked ? 'ri-lock-unlock-fill' : 'ri-lock-fill'"
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
          :label="`Veuillez taper '${selectedProject.name}' pour confirmer la suppression du projet`"
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
            text: '#Environnements',
          },
          {
            to: `#${repositoriesId}`,
            text: '#Dépôts',
          },
          {
            to: `#${membersId}`,
            text: '#Membres',
          },
          {
            to: `#${servicesId}`,
            text: '#Services',
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
          :rows="envRows"
        />
        <DsfrTable
          :id="repositoriesId"
          :key="repositoriesCtKey"
          title="Dépôts"
          :headers="['Nom', 'Type', 'Privé ?', 'url']"
          :rows="repoRows"
        />
        <TeamCt
          :id="membersId"
          :key="teamCtKey"
          :user-profile="userStore.userProfile"
          :project="selectedProject"
          :members="selectedProject.members"
          :can-manage="true"
          :can-transfer="true"
          @add-member="(email: string) => addUserToProject(email)"
          @remove-member="(userId: string) => removeUserFromProject(userId)"
          @transfer-ownership="(nextOwnerId: string) => transferOwnerShip(nextOwnerId)"
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
            @reload="() => reloadProjectServices(selectedProject?.id ?? '')"
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
@/stores/project-member.js
