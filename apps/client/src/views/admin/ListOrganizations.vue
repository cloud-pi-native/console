<script lang="ts" setup>
import { computed, onBeforeMount, ref } from 'vue'
import {
  formatDate,
  OrganizationSchema,
  sortArrByObjKeyAsc,
  SharedZodError,
  parseZodError,
  type CreateOrganizationBody,
  type Organization,
  organizationContract,
} from '@cpn-console/shared'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import { useOrganizationStore } from '@/stores/organization.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const organizationStore = useOrganizationStore()

const snackbarStore = useSnackbarStore()

const allOrganizations = ref<Organization[]>([])
const newOrg = ref<CreateOrganizationBody>({ name: '', label: '', source: '' })
const tableKey = ref(getRandomId('table'))

const title = 'Liste des organisations'
const headers = [
  'Label',
  'Nom',
  'Source',
  'Active',
  'Création',
  'Modification',
]
const isSyncingOrganizations = ref(false)
const isUpdatingOrganization = ref<null | { name: string, key: string, data: unknown }>(null)

const isOrgAlreadyTaken = computed(() => !!allOrganizations.value.find(org => org.name === newOrg.value.name))

const errorSchema = computed<SharedZodError | undefined>(() => {
  const schemaValidation = OrganizationSchema.pick({ label: true, name: true }).safeParse(newOrg.value)
  return schemaValidation.success ? undefined : schemaValidation.error
})

const generateRows = () => allOrganizations.value.length
  ? sortArrByObjKeyAsc(allOrganizations.value, 'name')
    ?.map(({ label, name, source, active, createdAt, updatedAt }) => ([
      {
        component: 'input',
        value: label,
        class: 'fr-input fr-text-default--info',
        'data-testid': `${name}-label-input`,
        onBlur: (event: Event & { target: { value: string } }) => {
          const data = event.target?.value
          if (data !== label) {
            preUpdateOrganization({ name, key: 'label', data })
          }
        },
      },
      name,
      source,
      {
        component: 'input',
        type: 'checkbox',
        checked: active,
        'data-testid': `${name}-active-cbx`,
        class: 'fr-checkbox-group--sm',
        title: active ? `Désactiver l'organisation ${name}` : `Réactiver l'organisation ${name}`,
        onClick: (event: Event & { target: { checked: boolean } }) => {
          const data = event.target.checked
          if (data !== active) {
            preUpdateOrganization({ name, key: 'active', data })
          }
        },
      },
      formatDate(createdAt),
      formatDate(updatedAt),
    ]))
  : [[{
    text: 'Aucune organisation, veuillez en ajouter une.',
    cellAttrs: {
      colspan: headers.length,
      align: 'center',
    },
  }]]

const rows = ref<ReturnType<typeof generateRows>>([])

const setRows = () => {
  rows.value = generateRows()
  tableKey.value = getRandomId('table')
}

const getAllOrganizations = async () => {
  await organizationStore.listOrganizations()
  allOrganizations.value = organizationStore.organizations
  setRows()
}

const syncOrganizations = async () => {
  isSyncingOrganizations.value = true
  await organizationStore.syncOrganizations()
  getAllOrganizations()
  isSyncingOrganizations.value = false
}

const createOrganization = async () => {
  if (isOrgAlreadyTaken.value) {
    snackbarStore.setMessage('Une organisation portant ce nom existe déjà.', 'error')
    return
  }
  if (errorSchema.value) {
    snackbarStore.setMessage(parseZodError(errorSchema.value))
    return
  }
  await organizationStore.createOrganization(newOrg.value)
  snackbarStore.setMessage(`Organisation ${newOrg.value.name} créée`, 'success')
  await getAllOrganizations()

  newOrg.value = { name: '', label: '', source: '' }
}

const preUpdateOrganization = ({ name, key, data }: { name: string, key: string, data: unknown }) => {
  isUpdatingOrganization.value = {
    name,
    key,
    data,
  }
}

const confirmUpdateOrganization = async ({ name, key, data }: { name: string, key: string, data: unknown }) => {
  isUpdatingOrganization.value = null
  await updateOrganization({ name, key, data })
}

const cancelUpdateOrganization = async () => {
  isUpdatingOrganization.value = null
  await getAllOrganizations()
}

const updateOrganization = async ({ name, key, data }: { name: string, key: string, data: unknown }) => {
  const org = {
    name,
    [key]: data,
  }

  const schemaValidation = organizationContract.updateOrganization.body.safeParse(org)

  if (isOrgAlreadyTaken.value) {
    snackbarStore.setMessage('Une organisation portant ce nom existe déjà.', 'error')
    return
  }
  if (!schemaValidation.success) {
    snackbarStore.setMessage(parseZodError(schemaValidation.error))
    return
  }
  await organizationStore.updateOrganization(org)
  snackbarStore.setMessage(`Organisation ${name} mise à jour`, 'success')
  await getAllOrganizations()
}

onBeforeMount(async () => {
  await getAllOrganizations()
  newOrg.value = { name: '', label: '', source: '' }
})
</script>

<template>
  <div
    v-if="isUpdatingOrganization"
    class="danger-zone"
    data-testid="confirmUpdateOrganizationZone"
  >
    <p
      data-testid="updatedDataSummary"
    >
      Les données suivantes seront mises à jour pour l'organisation {{ isUpdatingOrganization.name }} :
      <br>
      <code>
        {{ isUpdatingOrganization.key }} : {{ isUpdatingOrganization.data }}
      </code>
    </p>
    <DsfrAlert
      v-if="isUpdatingOrganization.key === 'active'
        && isUpdatingOrganization.data === false"
      data-testid="lockOrganizationAlert"
      description="Les projets associés à cette organisation seront vérrouillés, jusqu'à la réactivation de l'organisation."
      type="warning"
      small
    />
    <div
      class="mt-8 flex gap-4"
    >
      <DsfrButton
        label="Confirmer"
        data-testid="confirmUpdateBtn"
        primary
        @click="confirmUpdateOrganization(isUpdatingOrganization)"
      />
      <DsfrButton
        label="Annuler"
        data-testid="cancelUpdateBtn"
        secondary
        @click="cancelUpdateOrganization()"
      />
    </div>
  </div>
  <div
    v-show="!isUpdatingOrganization"
  >
    <DsfrTable
      :key="tableKey"
      data-testid="tableAdministrationOrganizations"
      :title="title"
      :headers="headers"
      :rows="rows"
    />
    <DsfrFieldset
      legend="Ajouter une organisation"
      hint="Assurez-vous que l'organisation que vous souhaitez créer ne se trouve pas déjà dans la liste, sous un autre nom."
      data-testid="addOrgForm"
    >
      <DsfrInput
        v-model="newOrg.label"
        data-testid="orgLabelInput"
        type="text"
        label="Label de l'organisation"
        label-visible
        placeholder="Ministère de l'économie et des finances"
        :is-invalid="(!!newOrg.label && !OrganizationSchema.pick({label: true}).safeParse({label: newOrg.label}).success) || isOrgAlreadyTaken"
        class="fr-mb-2w"
      />
      <DsfrInput
        v-model="newOrg.name"
        data-testid="orgNameInput"
        type="text"
        label="Nom de l'organisation"
        hint="Ce nom sera utilisé pour construire le namespace du projet. Il doit être en minuscule et ne pas faire plus de 10 caractères ni contenir de caractères spéciaux."
        label-visible
        placeholder="meco"
        :is-invalid="(!!newOrg.name && !OrganizationSchema.pick({name: true}).safeParse({name: newOrg.name}).success) || isOrgAlreadyTaken"
        class="fr-mb-2w"
      />
      <DsfrAlert
        v-if="isOrgAlreadyTaken"
        data-testid="orgErrorInfo"
        description="Une organisation portant ce nom existe déjà."
        small
        type="error"
        class="w-max fr-mb-2w"
      />
      <DsfrButton
        data-testid="addOrgBtn"
        label="Ajouter l'organisation"
        secondary
        icon="ri-user-add-line"
        :disabled="!!errorSchema || isOrgAlreadyTaken"
        @click="createOrganization()"
      />
    </DsfrFieldset>

    <DsfrFieldset
      legend="Synchroniser les organisations"
      hint="Cette opération mettra à jour la liste des organisations."
      data-testid="syncOrgsForm"
    >
      <DsfrButton
        data-testid="syncOrgsBtn"
        label="Synchroniser les organisations"
        primary
        icon="ri-exchange-line"
        :disabled="isSyncingOrganizations"
        @click="syncOrganizations()"
      />
    </DsfrFieldset>
  </div>
</template>
