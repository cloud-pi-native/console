<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  length: number
  step: number
  page: number
  isUpdating: boolean
}>(), {
  length: 0,
  step: 10,
  page: 0,
  isUpdating: false,
})

const emit = defineEmits(['setPage'])
const maxPage = computed(() => Math.floor(props.length / props.step))
const currentStart = computed(() => Math.floor(props.page * props.step))
</script>

<template>
  <div
    class="flex justify-around"
    data-testid="paginationCt"
  >
    <div
      class="flex gap-2"
    >
      <button
        class="i-ri-arrow-left-double-fill icon-btn fr-btn"
        title="Voir la première page"
        :disabled="props.isUpdating || props.page <= 0"
        data-testid="seeFirstPageBtn"
        @click="emit('setPage', 0)"
      />
      <button
        class="i-ri-arrow-drop-left-line icon-btn fr-btn"
        title="Voir la page précédente"
        :disabled="props.isUpdating || props.page <= 0"
        data-testid="seePreviousPageBtn"
        @click="emit('setPage', Math.max(props.page - 1, 0))"
      />
    </div>
    <p
      class="flex items-center"
      data-testid="positionInfo"
    >
      {{ `${currentStart + 1} - ${Math.min(currentStart + props.step, props.length)} sur ${props.length}` }}
    </p>
    <div
      class="flex gap-2"
    >
      <button
        class="i-ri-arrow-drop-right-line icon-btn fr-btn"
        title="Voir la page suivante"
        :disabled="props.isUpdating || props.page >= maxPage"
        data-testid="seeNextPageBtn"
        @click="emit('setPage', Math.min(maxPage, page + 1))"
      />
      <button
        class="i-ri-arrow-right-double-line icon-btn fr-btn"
        title="Voir la dernière page"
        :disabled="props.isUpdating || props.page >= maxPage"
        data-testid="seeLastPageBtn"
        @click="emit('setPage', maxPage)"
      />
    </div>
  </div>
</template>
