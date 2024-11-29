<script lang="ts" setup>
import type { User } from '@cpn-console/shared'
import { copyContent, textToHSL } from '@/utils/func.js'
import router from '@/router/index.js'
import { useUserStore } from '@/stores/user.js'

const props = withDefaults(defineProps<{
  user: Omit<User, 'adminRoleIds' | 'type' | 'createdAt' | 'updatedAt'> & { type?: User['type'] }
  mode?: 'icon' | 'short' | 'full'
  modal?: boolean
  attributes?: string
  recursiveSlots?: boolean
  selectable?: boolean
  asTableRow?: boolean
  noIcon?: boolean
  size?: 'sm' | 'm' | 'lg'
  goToVue?: boolean
}>(), {
  mode: 'icon',
  modal: true,
  attributes: '',
  recursiveSlots: false,
  selectable: false,
  asTableRow: false,
  noIcon: false,
  size: 'm',
  goToVue: false,
})

const emits = defineEmits<{
  select: [value: boolean]
}>()
const selected = ref(false)
const userLocal = props.user
const fullName = `${userLocal.firstName} ${userLocal.lastName}`
const bgColor = textToHSL(fullName)
const initials = userLocal.firstName[0].toUpperCase() + userLocal.lastName[0].toUpperCase()

function toggleSelect() {
  if (!props.selectable) {
    return
  }
  selected.value = !selected.value
  emits('select', selected.value)
}
const rowType = props.mode === 'full' && props.asTableRow ? 'tr' : 'div'
const cellType = props.mode === 'full' && props.asTableRow ? 'td' : 'div'
const sizes: Record<typeof props['size'], {
  icon: string
  iconFont: string
  font: string
  maxH: string
  modalM: string
}> = {
  m: {
    maxH: 'h-12',
    icon: 'w-12 h-12',
    font: 'text-base',
    iconFont: 'text-xl',
    modalM: '-ml-3 -mt-20',
  },
  lg: {
    maxH: 'h-18',
    icon: 'w-18 h-18',
    font: 'text-xl',
    iconFont: 'text-3xl',
    modalM: '-ml-4 -mt-26',
  },
  sm: {
    maxH: 'h-8',
    icon: 'w-8 h-8',
    font: 'text-sm',
    iconFont: 'text-sm',
    modalM: '-ml-3 -mt-20 ',
  },
}
</script>

<template>
  <component
    :is="rowType"
    :class="`
    ${
      mode === 'full'
        ? 'w-full'
        : `rounded-full ${sizes[size].maxH}`}
    ${
      mode !== 'icon'
        ? mode === 'full'
          ? 'p-3'
          : ' pr-1'
        : ''
    }
    ${
      asTableRow
        ? ''
        : 'flex flex-row gap-2 items-stretch flex-start justify-items-stretch ring-2 ring-gray-500/10 bg-gray-500/05'
    }
    ${attributes} has-tooltip `"
    :data-testid="`user-${user.id}`"
  >
    <component
      :is="cellType"
      v-if="!noIcon"
      :class="`${
        asTableRow
          ? mode === 'full' ? 'p-2' : ''
          : 'user-icon flex place-items-center flex-row gap-3'
      }`"
    >
      <div
        :class="`relative rounded-full aspect-square text-center content-center font-extrabold text-slate-100 self-center aspect-square ${sizes[size].icon} text-lg`"
        :style="`background-color: ${bgColor};`"
        @click="toggleSelect"
      >
        <div
          v-if="selected"
        >
          <slot name="select-overlay">
            <div
              :class="`rounded-full absolute origin-bottom-left ${sizes[size].icon} bg-gray-900/50 hover:bg-gray-900/70 top-0 left-0 align-middle flex items-center justify-center`"
            >
              <v-icon
                name="ri:check-line"
                class="w-8 h-8 place-align-bottom"
              />
            </div>
          </slot>
        </div>
        <div
          v-else
          :class="`rounded-full absolute origin-bottom-left ${sizes[size].icon} top-0 left-0 align-middle ${selectable ? 'hover:bg-gray-600/70' : ''}`"
        />
        <div
          :class="sizes[size].iconFont"
        >
          {{ initials }}
        </div>
      </div>
      <div
        v-if="mode === 'short'"
        :class="`text-center grow mr-3 font-bold ${sizes[size].font}`"
        @click="useUserStore().adminPerms && router.push({ name: 'AdminUser', params: { id: user.id } })"
      >
        {{ fullName }}
      </div>
    </component>
    <component
      :is="cellType"
      v-if="mode === 'full'"
      :class="`${
        asTableRow
          ? 'p-2'
          : 'grid grid-rows'
      }`"
    >
      <div
        class="h-full flex"
        @click="useUserStore().adminPerms && router.push({ name: 'AdminUser', params: { id: user.id } })"
      >
        <div class="font-bold">
          {{ fullName }}
        </div>
        <DsfrTag
          v-if="user.type !== 'human'"
          class="ml-2 shadow"
          :label="user.type"
        />
      </div>
      <div
        class="flex flex-col"
      >
        <code
          title="Copier l'email"
          class="fr-text-default--info text-xs cursor-pointer"
          :onClick="() => copyContent(user.email)"
        >
          {{ user.email }}
        </code>
      </div>
    </component>
    <slot
      v-if="mode === 'full'"
      name="extra"
    />
    <div
      v-if="mode !== 'full' && modal"
      style="background-color: --var(--background-default-grey) !important;"
      :class="`tooltip shadow-lg ${sizes[size].modalM}`"
    >
      <UserCt
        :user="userLocal"
        mode="full"
        class="w-full"
        :selectable="false"
        :size="size"
      >
        <template
          v-if="recursiveSlots" #extra
        >
          <slot name="extra" />
        </template>
      </UserCt>
    </div>
  </component>
</template>

<style>
.tooltip {
  position: absolute;
  visibility: hidden;
  background-color: --var(--background-default-grey)
}

.has-tooltip:hover .tooltip {
  visibility: initial;
  z-index: 50;
}
</style>
