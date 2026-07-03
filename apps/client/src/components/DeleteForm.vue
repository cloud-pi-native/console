<script lang="ts" setup>
const props = withDefaults(defineProps<{
  disabled?: boolean
  deleteValidationInput?: string
  isLoading?: boolean
}>(), {
  disabled: false,
  deleteValidationInput: 'DELETE',
  isLoading: false,
})

defineEmits<{
  delete: []
}>()

const isDeleting = ref(false)
const deleteConfirmValue = ref('')
</script>

<template>
  <div
    class="danger-zone"
  >
    <div class="danger-zone-btns">
      <DsfrButton
        v-show="!isDeleting"
        label="Supprimer"
        danger
        :disabled="props.disabled"
        icon="ri:delete-bin-7-line"
        @click="isDeleting = true"
      />
      <DsfrAlert
        class="<md:mt-2"
        description="La suppression est irréversible."
        type="warning"
        small
      />
    </div>
    <div
      v-if="isDeleting"
      class="fr-mt-4w"
    >
      <DsfrInput
        v-model="deleteConfirmValue"
        :label="`Veuillez taper '${deleteValidationInput}' pour confirmer la suppression de l'environnement`"
        label-visible
        :placeholder="deleteValidationInput"
        class="fr-mb-2w"
      />
      <div
        class="flex justify-between"
      >
        <div class="flex">
          <DsfrButton
            label="Supprimer définitivement"
            :disabled="deleteConfirmValue !== deleteValidationInput || props.isLoading"
            title="Supprimer définitivement"
            danger
            icon="ri:delete-bin-7-line"
            @click="$emit('delete')"
          />
          <DsfrButton v-if="props.isLoading" :icon="{ name: 'ri:refresh-line', animation: 'spin' }" icon-only disabled />
        </div>
        <DsfrButton
          label="Annuler"
          primary
          @click="isDeleting = false"
        />
      </div>
    </div>
  </div>
</template>
