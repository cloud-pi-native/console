import type { projectStatus, ProjectV2, statusDict } from '@cpn-console/shared'
import { defineStore } from 'pinia'

export type ProjectSortField = keyof Pick<ProjectV2, 'createdAt' | 'lastSuccessProvisionningVersion' | 'slug' | 'status' | 'name' | 'locked'> | 'ownerEmail'
interface SortMethod { field: ProjectSortField, inverted?: boolean }
export type Version = 'last' | 'outdated' | 'any'

export const useUserPreferenceStore = defineStore('user-preference', () => {
  const sorts = ref<SortMethod[]>([{
    field: 'createdAt',
    inverted: true,
  }])
  const statusChoice = ref<(typeof projectStatus[number])[]>(['created', 'failed', 'warning'])
  const lockChoice = ref<(keyof typeof statusDict.locked)[]>([])
  const versionChoice = ref<Version>('any')
  const projectSearchText = ref('')

  function chooseSort(field: ProjectSortField, event: MouseEvent) {
    const itemIndex = sorts.value.findIndex(item => item.field === field)
    if (event.shiftKey) {
      if (itemIndex >= 0) {
        sorts.value[itemIndex].inverted = !sorts.value[itemIndex].inverted
        return
      }
      sorts.value.unshift({ field })
      return
    }
    if (itemIndex >= 0) {
      sorts.value[itemIndex].inverted = !sorts.value[itemIndex].inverted
      return
    }
    sorts.value = [{ field }]
  }
  return {
    chooseSort,
    lockChoice,
    projectSearchText,
    sorts,
    statusChoice,
    versionChoice,
  }
})
