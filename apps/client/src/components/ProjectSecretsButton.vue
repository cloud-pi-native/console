<script lang="ts" setup>
import { clickInDialog, copyContent } from '@/utils/func.js'
import type { Project } from '@/utils/project-utils.js'

const props = defineProps<{
  project: Project
}>()

const isSecretShown = ref(false)
const projectSecrets = ref<Record<string, Record<string, string>> | null>(null)

async function handleSecretDisplay() {
  isSecretShown.value = !isSecretShown.value
  if (isSecretShown.value && projectSecrets.value == null) {
    projectSecrets.value = await props.project.Services.getSecrets()
  }
}

function closeModal(e?: MouseEvent | TouchEvent) {
  // @ts-ignore
  if (e && e.target?.tagName !== 'DIALOG') {
    return
  }
  isSecretShown.value = false
  projectSecrets.value = null
}
</script>

<template>
  <DsfrButton
    data-testid="showSecretsBtn"
    :label="`${isSecretShown ? 'Cacher' : 'Afficher'} les secrets des services`"
    :icon="project.operationsInProgress.includes('searchSecret')
      ? { name: 'ri:refresh-line', animation: 'spin' }
      : isSecretShown ? 'ri:eye-off-line' : 'ri:eye-line'"
    :disabled="project.locked || project.operationsInProgress.includes('searchSecret')"
    @click="handleSecretDisplay"
  />
  <DsfrModal
    v-model:opened="isSecretShown"
    title="Secrets du projet"
    data-testid="projectSecretsZone"
    :is-alert="true"
    @close="closeModal"
    @click="(e: MouseEvent | TouchEvent) => clickInDialog(e, closeModal)"
  >
    <p
      v-if="projectSecrets == null"
    >
      <Loader />
    </p>
    <p
      v-else-if="!Object.entries(projectSecrets).length"
      data-testid="noProjectSecretsP"
    >
      Aucun secret à afficher
    </p>
    <div
      v-for="([service, secrets]) of Object.entries(projectSecrets)"
      v-else
      :key="service"
    >
      <h6 class="fr-mb-1w fr-mt-3w">
        {{ service }}
      </h6>
      <DsfrTable
        class="horizontal-table"
        :headers="Object.keys(projectSecrets[service])"
        title=""
      >
        <tr
          v-for="(secret) in Object.values(secrets)"
          :key="secret"
          @click="copyContent(secret)"
        >
          <td>
            <pre
              title="Copier la valeur"
              class="fr-text-default--info text-xs cursor-pointer m-1"
            >{{ secret }}</pre>
          </td>
        </tr>
      </DsfrTable>
    </div>
  </DsfrModal>
</template>
