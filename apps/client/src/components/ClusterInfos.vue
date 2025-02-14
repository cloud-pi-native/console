<script lang="ts">
import type { Cluster } from '@cpn-console/shared'

defineProps<{
  cluster: Cluster
}>()
</script>

<template>
  <div>
    {{ cluster.label }}
  </div>
</template>
