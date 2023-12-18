<script lang="ts" setup>
import { computed, onBeforeMount, ref } from 'vue'
import { useAdminOrganizationStore } from '@/stores/admin/organization.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import {
  formatDate,
  schemaValidator,
  isValid,
  instanciateSchema,
  organizationSchema,
  sortArrByObjKeyAsc,
} from '@dso-console/shared'
import { getRandomId } from '@gouvminint/vue-dsfr'
import { handleError } from '@/utils/func.js'

const adminOrganizationStore = useAdminOrganizationStore()

const snackbarStore = useSnackbarStore()

const allOrganizations = ref([])
const newOrg = ref({})
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
const rows = ref([])

const isSyncingOrganizations = ref(false)
const isUpdatingOrganization = ref(null)

const isOrgAlreadyTaken = computed(() => allOrganizations.value.find(org => org.name === newOrg.value.name))

const setRows = () => {
  rows.value = allOrganizations.value.length
    ? sortArrByObjKeyAsc(allOrganizations.value, 'name')
      ?.map(({ label, name, source, active, createdAt, updatedAt }) => ([
        {
          component: 'input',
          value: label,
          class: 'fr-input fr-text-default--info',
          'data-testid': `${name}-label-input`,
          onBlur: (event) => {
            const data = event.target.value
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
          onClick: (event) => {
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
  tableKey.value = getRandomId('table')
}

const getAllOrganizations = async () => {
  try {
    allOrganizations.value = await adminOrganizationStore.getAllOrganizations()
    setRows()
  } catch (error) {
    handleError(error)
  }
}

const syncOrganizations = async () => {
  isSyncingOrganizations.value = true
  try {
    await adminOrganizationStore.fetchOrganizations()
    getAllOrganizations()
  } catch (error) {
    handleError(error)
  }
  isSyncingOrganizations.value = false
}

const createOrganization = async () => {
  const keysToValidate = ['label', 'name']
  const errorSchema = schemaValidator(organizationSchema, newOrg.value, { keysToValidate })
  if (Object.keys(errorSchema).length || isOrgAlreadyTaken.value) {
    snackbarStore.setMessage(Object.values(errorSchema)[0])
    return
  }
  try {
    await adminOrganizationStore.createOrganization(newOrg.value)
    snackbarStore.setMessage(`Organisation ${newOrg.value.name} créée`, 'success')
    await getAllOrganizations()
  } catch (error) {
    handleError(error)
  }

  newOrg.value = instanciateSchema({ schema: organizationSchema }, undefined)
}

const preUpdateOrganization = ({ name, key, data }) => {
  isUpdatingOrganization.value = {
    name,
    key,
    data,
  }
}

const confirmUpdateOrganization = async ({ name, key, data }) => {
  isUpdatingOrganization.value = null
  await updateOrganization({ name, key, data })
}

const cancelUpdateOrganization = async () => {
  isUpdatingOrganization.value = null
  await getAllOrganizations()
}

const updateOrganization = async ({ name, key, data }) => {
  const org = {
    name,
    [key]: data,
  }
  const keysToValidate = ['name', key]
  const errorSchema = schemaValidator(organizationSchema, org, { keysToValidate })
  if (Object.keys(errorSchema).length || isOrgAlreadyTaken.value) {
    snackbarStore.setMessage(Object.values(errorSchema)[0])
    return
  }
  try {
    await adminOrganizationStore.updateOrganization(org)
    snackbarStore.setMessage(`Organisation ${name} mise à jour`, 'success')
    await getAllOrganizations()
  } catch (error) {
    handleError(error)
  }
}

onBeforeMount(async () => {
  await getAllOrganizations()
  newOrg.value = instanciateSchema({ schema: organizationSchema }, undefined)
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
        :is-invalid="(!!newOrg.label && isValid(organizationSchema, newOrg, 'email')) || isOrgAlreadyTaken"
        class="fr-mb-2w"
      />
      <DsfrInput
        v-model="newOrg.name"
        data-testid="orgNameInput"
        type="text"
        label="Nom de l'organisation"
        hint="Ce nom sera utilisé pour construire le namespace du projet. Il doit être en minuscule et ne pas faire plus de 10 caractères ni contenir de caractères spéciaux hormis le trait d'union '-'."
        label-visible
        placeholder="min-eco"
        :is-invalid="(!!newOrg.label && isValid(organizationSchema, newOrg, 'email')) || isOrgAlreadyTaken"
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
        :disabled="!newOrg.label || !newOrg.name || !isValid(organizationSchema, newOrg, 'label') || !isValid(organizationSchema, newOrg, 'name') || isOrgAlreadyTaken"
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
