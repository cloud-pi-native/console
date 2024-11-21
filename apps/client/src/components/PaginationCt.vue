<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  length: number
  step: number
  page: number
  displayPageSelect?: boolean
}>(), {
  length: 0,
  step: 10,
  page: 0,
  displayPageSelect: false,
})

const emit = defineEmits<{
  setPage: [number]
}>()
const maxPage = computed(() => Math.floor(props.length / props.step))
</script>

<template>
  <div
    class="flex justify-around"
    data-testid="paginationCt"
  >
    <div
      class="flex gap-2"
    >
      <DsfrButton
        icon="ri:arrow-left-double-fill"
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
    <div class="flex flex-row justify-center">
      <span class="flex items-center">page&nbsp;</span>
      <select
        v-if="displayPageSelect"
        id="page" name="page"
        @change="(e: any) => {
          console.log(Number(e.target!.value));
          emit('setPage', Number(e.target!.value) - 1)
        }"
      >
        <option
          v-for="targetPage in Math.ceil(props.length / props.step)"
          :key="targetPage"
          :value="targetPage"
          :selected="targetPage === page + 1"
        >
          {{ targetPage }}
        </option>
      </select>
      <span
        v-else
        class="flex items-center"
        data-testid="positionInfo"
      >
        {{ page + 1 }}&nbsp;
      </span>
      <span
        class="flex items-center"
        data-testid="positionInfo"
      >
        {{ `sur ${Math.ceil(props.length / props.step)}` }}
      </span>
    </div>
    <div
      class="flex gap-2"
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
