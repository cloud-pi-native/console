<script lang="ts" setup>
import type { Deployment, Stage } from '@cpn-console/shared'

defineProps<{ deployment: Deployment & { stage?: Stage } }>()
</script>

<template>
  <div class="fr-card fr-enlarge-link cursor-pointer w-1/5 min-w-xs">
    <div class="fr-card__body">
      <div class="fr-card__content fr-px-4v fr-pb-4v fr-pt-5v">
        <p class="font-bold">
          {{ deployment.name }}
        </p>
        <DsfrBadge
          class="fr-mb-0"
          :label="`${deployment.environment.name}${deployment.stage?.name ? ` • ${deployment.stage.name}` : ''}`"
          no-icon
          small
          type="info"
        />
        <p class="fr-text--sm fr-text-mention--grey uppercase font-bold fr-my-4v">
          {{ deployment.deploymentSources.length }}
          <template v-if="deployment.deploymentSources.length > 1">
            dépôts
          </template>
          <template v-else>
            dépôt
          </template>
        </p>
        <div class="flex flex-wrap items-start gap-2 mb-4">
          <div
            v-for="source in deployment.deploymentSources"
            :key="source.id"
            class="px-2 py-1 shadow fr-background-alt--grey flex items-center gap-2 fr-text--sm mb-0"
          >
            <v-icon name="mdi:git" class="flex-shrink-0" />
            {{ source.repository.internalRepoName }}
            <span class="text-xs fr-m-0 fr-text-mention--grey font-mono leading-none">
              {{ source.targetRevision || 'HEAD' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
