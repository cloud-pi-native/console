<script setup lang="ts">
import type { ExperimentalFeatureScope, ExperimentalFeatureTarget } from '@cpn-console/shared'
import { AdminAuthorized, ExperimentalFeatureScopeSchema } from '@cpn-console/shared'
import { computed, onMounted, ref } from 'vue'
import { authorizeExperimentalFeatureTarget, listExperimentalFeatureTargets, requestExperimentalFeatureActivation } from '@/api/experimental-feature.js'
import { useUserStore } from '@/stores/user.js'

const user = useUserStore()
const canManage = computed(() => AdminAuthorized.ManageSystem(user.adminPerms))
const targets = ref<ExperimentalFeatureTarget[]>([])
const kind = ref<ExperimentalFeatureScope['kind']>('project')
const scopeId = ref('')
const busy = ref(false)
const error = ref('')
const scopeLabels: Record<ExperimentalFeatureScope['kind'], string> = {
  instance: 'Instance du socle',
  cluster: 'Cluster',
  project: 'Projet',
  environment: 'Environnement',
}
const actionLabels = { authorize: 'Autorisation', activate: 'Activation demandée', suspend: 'Suspension demandée' }

async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Action impossible ; veuillez réessayer.'
  } finally {
    busy.value = false
  }
}

function requestLabel(target: ExperimentalFeatureTarget): string {
  if (target.requested) return 'Activation demandée'
  return target.events.some(event => event.action === 'suspend')
    ? 'Suspension demandée'
    : 'Aucune activation demandée'
}

function updateTarget(target: ExperimentalFeatureTarget) {
  targets.value = [...targets.value.filter(item => item.id !== target.id), target]
}

async function reload() {
  await run(async () => { targets.value = await listExperimentalFeatureTargets() })
}

async function authorize() {
  await run(async () => {
    const scope = ExperimentalFeatureScopeSchema.safeParse({ kind: kind.value, id: kind.value === 'instance' ? 'console' : scopeId.value.trim() })
    if (!scope.success) throw new Error(`Identifiant de ${scopeLabels[kind.value].toLowerCase()} invalide : ${scopeId.value}`)
    updateTarget(await authorizeExperimentalFeatureTarget(scope.data))
    scopeId.value = ''
  })
}

async function request(target: ExperimentalFeatureTarget, requested: boolean) {
  await run(async () => {
    updateTarget(await requestExperimentalFeatureActivation(target.id, { requested, expectedRevision: target.revision }))
  })
}

onMounted(reload)
</script>

<template>
  <h1>Expérimentations — OpenCDS</h1>
  <p>La Service Team autorise un périmètre, puis demande son activation.</p>
  <p class="fr-notice fr-p-2w">
    Prototype : les demandes sont enregistrées, pas encore appliquées à OpenCDS.
    Une suspension ne restaure pas les ressources déjà modifiées.
  </p>
  <p v-if="error" role="alert" class="fr-error-text">
    {{ error }}
  </p>
  <button type="button" class="fr-btn fr-btn--secondary fr-mb-3w" data-testid="reload-targets" :disabled="busy" @click="reload">
    Actualiser
  </button>
  <form v-if="canManage" class="fr-mb-4w" @submit.prevent="authorize">
    <h2>Autoriser un périmètre</h2>
    <label class="fr-label" for="experimental-feature-scope">Type de périmètre</label>
    <select id="experimental-feature-scope" v-model="kind" class="fr-select fr-mb-2w" :disabled="busy">
      <option v-for="(label, value) in scopeLabels" :key="value" :value="value">
        {{ label }}
      </option>
    </select>
    <template v-if="kind !== 'instance'">
      <label class="fr-label" for="experimental-feature-scope-id">
        Identifiant du périmètre
        <span class="fr-hint-text">Identifiant technique du projet, de l’environnement ou du cluster existant, pas son nom.</span>
      </label>
      <input id="experimental-feature-scope-id" v-model="scopeId" class="fr-input fr-mb-2w" :disabled="busy" required>
    </template>
    <button type="submit" class="fr-btn" data-testid="authorize-target" :disabled="busy">
      Autoriser ce périmètre
    </button>
  </form>
  <p v-if="!targets.length && !busy && !error">
    Aucun périmètre autorisé.
  </p>
  <section v-for="target in targets" :key="target.id" class="fr-mb-4w">
    <h2>{{ scopeLabels[target.scope.kind] }} — {{ target.scope.id }}</h2>
    <p>{{ requestLabel(target) }}</p>
    <p>Application réelle : non observée</p>
    <button v-if="canManage" type="button" class="fr-btn" :data-testid="`${target.requested ? 'suspend' : 'activate'}-${target.id}`" :disabled="busy" @click="request(target, !target.requested)">
      {{ target.requested ? 'Demander la suspension' : 'Demander l’activation' }}
    </button>
    <details class="fr-mt-2w">
      <summary>Historique des décisions</summary>
      <ul>
        <li v-for="event in target.events" :key="event.revision">
          {{ actionLabels[event.action] }} — {{ event.actorId }} — {{ new Date(event.createdAt).toLocaleString('fr-FR') }}
        </li>
      </ul>
    </details>
  </section>
</template>
