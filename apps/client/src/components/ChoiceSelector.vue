<script lang="ts" setup generic="T extends Record<string, any>, VALUE extends (Extract<keyof T, string>), LABEL extends (Extract<keyof T, string>)">
import { sortArrByObjKeyAsc } from '@cpn-console/shared'
import { ref, computed, onBeforeMount } from 'vue'

const props = withDefaults(defineProps<{
  options: T[],
  optionsSelected: T[],
  label: string | undefined,
  description: string,
  disabled: boolean,
  id: string,
  valueKey: VALUE,
  labelKey: LABEL,
  wrapped: boolean
}>(), {
  wrapped: true,
  disabled: false,
  id: 'choice1',
  description: '',
})

const isWrapped = ref(props.wrapped)
const selectedValues = ref<string[]>([])
const search = ref('')

const options = {
  selected: computed(() => sortArrByObjKeyAsc(props.options.filter(option => selectedValues.value.includes(option[props.valueKey])), props.labelKey)),
  notSelected: computed(() => sortArrByObjKeyAsc(props.options.filter(option => !selectedValues.value.includes(option[props.valueKey])), props.labelKey)),
}
const displayed = {
  notSelected: computed(() => options.notSelected.value.filter(option => option[props.labelKey].includes(search.value))),
  selected: computed(() => options.selected.value.filter(option => option[props.labelKey].includes(search.value))),
}

const emit = defineEmits<{
  update: [value: T[]]
}>()

const switchSelection = (event: string) => {
  const eventValue = event
  if (!eventValue) return

  if (selectedValues.value.includes(eventValue)) {
    selectedValues.value = selectedValues.value.filter(element => element !== eventValue)
  } else {
    selectedValues.value.push(eventValue)
  }
  emit('update', options.selected.value)
}

type SwitchMultipleParam = 'notSelected' | 'notSelectedDisplayed' | 'selected' | 'selectedDisplayed';
const switchMultiple = (choice: SwitchMultipleParam) => {
  if (choice === 'selected') {
    selectedValues.value = selectedValues.value.filter(value => !options.selected.value.find(select => select[props.valueKey] === value))
  } else if (choice === 'selectedDisplayed') {
    selectedValues.value = selectedValues.value.filter(value => !displayed.selected.value.find(select => select[props.valueKey] === value))
  } else if (choice === 'notSelected') {
    options.notSelected.value.forEach(option => selectedValues.value.push(option[props.valueKey]))
  } else if (choice === 'notSelectedDisplayed') {
    displayed.notSelected.value.forEach(option => selectedValues.value.push(option[props.valueKey]))
  }
}

onBeforeMount(() => {
  selectedValues.value = props.optionsSelected.map(option => option[props.valueKey])
})

type Group = {
  tagClass: string
  title: string;
  selectorKey: keyof typeof displayed;
  addButtonLabel: string;
  addButtonTestId: string;
  addVisibleButtonLabel: string;
  addVisibleButtonTestId: string;
  switchAll: () => void;
  switchVisible: () => void;
}

const groups: Group[] = [
  {
    tagClass: '',
    title: 'Non sélectionnés',
    selectorKey: 'notSelected',
    addButtonLabel: 'Ajouter tout',
    addButtonTestId: 'add-all',
    addVisibleButtonLabel: 'Ajouter visible',
    addVisibleButtonTestId: 'add-visible',
    switchAll: () => switchMultiple('notSelected'),
    switchVisible: () => switchMultiple('notSelectedDisplayed'),
  },
  {
    tagClass: 'fr-tag--dismiss',
    title: 'Sélectionnés',
    selectorKey: 'selected',
    addButtonLabel: 'Retirer tout',
    addButtonTestId: 'remove-all',
    addVisibleButtonLabel: 'Retirer visible',
    addVisibleButtonTestId: 'remove-visible',
    switchAll: () => switchMultiple('selected'),
    switchVisible: () => switchMultiple('selectedDisplayed'),
  },
]
</script>

<template>
  <div
    v-if="!isWrapped"
    :id="props.id"
    class="fr-select-group"
    :disabled="props.disabled"
  >
    <div @click="isWrapped = !isWrapped">
      <h6
        v-if="props.label"
        :data-testid="`choice-selector-title-${props.id}`"
        class="mb-1 inline-block fr-label"
      >
        {{ props.label }}
      </h6>
      <v-icon
        name="ri-arrow-right-s-line"
        class="shrink ml-4 rotate-90"
      />
    </div>
    <p
      v-if="props.description"
      :data-testid="`choice-selector-description-${props.id}`"
      class="fr-hint-text"
    >
      {{ props.description }}
    </p>
    <DsfrInput
      v-if="props.options.length > 6"
      v-model="search"
      type="inputType"
      class="mb-2"
      label=""
      :label-visible="false"
      :data-testid="`choice-selector-search-${props.id}`"
      placeholder="Recherchez"
    />
    <div class="grid gap-5  md:2xl:grid-rows-2 sm:md:grid-cols-2 md:2xl:grid-flow-row sm:md:grid-flow-col">
      <template
        v-for="group in groups"
        :key="group.id"
      >
        <div
          class="grow-x"
        >
          <label class="mb-1 ">
            {{ group.title }}
          </label>
          <div
            v-if="props.options.length > 6 && !props.disabled"
            class="flex gap-3 mb-3"
          >
            <DsfrButton
              type="buttonType"
              :label="group.addButtonLabel"
              secondary
              :disabled="props.disabled"
              :data-testid="`choice-selector-${group.addButtonTestId}-${props.id}`"
              @click="group.switchAll()"
            />
            <DsfrButton
              type="buttonType"
              :label="group.addVisibleButtonLabel"
              secondary
              :disabled="props.disabled"
              :data-testid="`choice-selector-${group.addVisibleButtonTestId}-${props.id}`"
              @click="group.switchVisible()"
            />
          </div>
          <div
            v-if="displayed[group.selectorKey].value.length"
            class="max-h-42 overflow-auto"
          >
            <div
              v-for="option in displayed[group.selectorKey].value"
              :key="option[props.valueKey]"
              class="inline-block mr-1 ml-1"
            >
              <DsfrTag
                :class="group.tagClass"
                :label="String(option[props.labelKey])"
                :data-testid="`${option[props.valueKey]}-${props.id}-tag`"
                :disabled="props.disabled"
                @click="!props.disabled ? switchSelection(option[props.valueKey]) : undefined"
              />
            </div>
          </div>
          <div v-else>
            <p
              v-if="options[group.selectorKey].value.length && search"
              class="italic text-sm"
            >
              La recherche masque les {{ options[group.selectorKey].value.length - displayed[group.selectorKey].value.length }} choix disponibles
            </p>
            <p
              v-else-if="!options[group.selectorKey].value.length"
              class="italic text-sm"
            >
              Aucun choix disponible
            </p>
          </div>
        </div>
      </template>
    </div>
  </div>
  <div
    v-else
    :id="props.id"
    @click="isWrapped = false"
  >
    <div @click="isWrapped = !isWrapped">
      <h6 class="mb-1 inline-block fr-label">
        {{ props.label }}
      </h6>
      <v-icon
        :class="`ml-4`"
        name="ri-arrow-right-s-line"
      />
    </div>
    <div
      v-for="option in options.selected.value.slice(0, 3)"
      :key="option[props.valueKey]"
      class="inline-block mr-1 ml-1"
    >
      <DsfrTag
        :label="String(option[props.labelKey])"
        :data-testid="`${option[props.valueKey]}-${props.id}-tag`"
        aria-pressed="false"
        @click="isWrapped = false"
      />
    </div>
    <div
      v-if="options.selected.value.length === 0"
      class="inline-block"
      @click="isWrapped = false"
    >
      <DsfrTag :label="`Aucune sélection, ${props.options.length} choix disponibles`" />
    </div>
    <div
      v-if="options.selected.value.length > 3"
      class="inline-block"
      @click="isWrapped = false"
    >
      <DsfrTag
        :label="`et ${options.selected.value.length - 3} de +`"
        :title="`${options.selected.value.slice(3,10).map(option => option[props.labelKey]).join('\n')}${options.selected.value.length>10?'\n...':''}`"
      />
    </div>
    <div
      v-else
      class="inline-block"
      @click="isWrapped = false"
    >
      <DsfrTag label="Modifier" />
    </div>
  </div>
</template>
