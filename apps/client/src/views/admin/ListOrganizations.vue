<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAdminOrganizationStore } from '@/stores/admin/organization.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import {
  formatDate,
  schemaValidator,
  isValid,
  instanciateSchema,
  organizationSchema,
} from 'shared'

const adminOrganizationStore = useAdminOrganizationStore()

const snackbarStore = useSnackbarStore()

const allOrganizations = ref([])
const newOrg = ref({})

const title = 'Liste des organisations'
const headers = [
  'Label',
  'Nom',
  'Active',
  'Création',
  'Modification',
]
const rows = ref([])

const isSyncingOrganizations = ref(false)

const isOrgAlreadyTaken = computed(() => allOrganizations.value.find(org => org.name === newOrg.value.name))

const setRows = () => {
  rows.value = allOrganizations.value?.map(({ label, name, active, createdAt, updatedAt }) => ([
    {
      component: 'input',
      value: label,
      class: 'fr-input fr-text-default--info',
      'data-testid': `${name}-label-input`,
      onBlur: (event) => {
        const data = event.target.value
        if (data !== label) {
          updateOrganization({ name, key: 'label', data })
        }
      },
    },
    name,
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
          updateOrganization({ name, key: 'active', data })
        }
      },
    },
    formatDate(createdAt),
    formatDate(updatedAt),
  ]))
}

const getAllOrganizations = async () => {
  try {
    allOrganizations.value = await adminOrganizationStore.getAllOrganizations()
    setRows()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

const syncOrganizations = async () => {
  isSyncingOrganizations.value = true
  try {
    await adminOrganizationStore.fetchOrganizations()
    getAllOrganizations()
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
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
    snackbarStore.setMessage(error?.message, 'error')
  }

  newOrg.value = instanciateSchema({ schema: organizationSchema }, undefined)
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
    snackbarStore.setMessage(error?.message, 'error')
  }
}

onMounted(async () => {
  await getAllOrganizations()
  newOrg.value = instanciateSchema({ schema: organizationSchema }, undefined)
})
</script>

<template>
  <DsfrTable
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
</template>
