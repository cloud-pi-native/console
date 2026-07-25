<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  length: number
  step: number
  page: number
}>(), {
  length: 0,
  step: 10,
  page: 0,
})

const emit = defineEmits(['setPage'])
const maxPage = computed(() => Math.floor((props.length - 1) / props.step))
const currentStart = computed(() => Math.floor(props.page * props.step))
</script>

<template>
  <div
    class="flex justify-evenly"
    data-testid="paginationCt"
  >
    <div
      class="flex gap-2 grow justify-end"
    >
      <DsfrButton
        icon="ri:arrow-left-double-line"
        :icon-only="true"
        title="Voir la première page"
        :disabled="page <= 0"
        data-testid="seeFirstPageBtn"
        @click="emit('setPage', 0)"
      />
      <DsfrButton
        icon="ri:arrow-drop-left-line"
        :icon-only="true"
        title="Voir la page précédente"
        :disabled="page <= 0"
        data-testid="seePreviousPageBtn"
        @click="emit('setPage', Math.max(props.page - 1, 0))"
      />
    </div>
    <div
      class="flex justify-center items-center mx-10 min-w-30"
    >
      <span
        data-testid="positionInfo"
      >
        {{ length ? `${currentStart + 1} - ${Math.min(currentStart + props.step, props.length)} sur ${props.length}` : `0 - 0 sur 0` }}
      </span>
    </div>
    <div
      class="flex gap-2 grow"
    >
      <DsfrButton
        icon="ri:arrow-drop-right-line"
        :icon-only="true"
        title="Voir la page suivante"
        :disabled="(page * step + step) >= length"
        data-testid="seeNextPageBtn"
        @click="emit('setPage', Math.min(maxPage, page + 1))"
      />
      <DsfrButton
        icon="ri:arrow-right-double-line"
        :icon-only="true"
        title="Voir la dernière page"
        :disabled="(page * step + step) >= length"
        data-testid="seeLastPageBtn"
        @click="emit('setPage', maxPage)"
      />
    </div>
  </div>
</template>
