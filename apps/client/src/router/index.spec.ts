import { describe, it, expect } from 'vitest'
import { detectProjectslug } from './index.js'
import { useProjectStore } from '@/stores/project.js'

setActivePinia(createPinia())
describe('test router functions: detectProjectslug', () => {
  const projectStore = useProjectStore()
  const slug = 'the-slug'
  const uuid = crypto.randomUUID()
  projectStore.updateStore([{
    slug,
    id: uuid,
  }])
  it('it should return project\'slug with uuid passed', () => {
    const slugFound = detectProjectslug({
      params: {
        slug: uuid,
      },
    })
    expect(slugFound).toEqual(slug)
  })

  it('it should return project\'slug with slug passed', () => {
    const slugFound = detectProjectslug({
      params: {
        slug,
      },
    })
    expect(slugFound).toEqual(slug)
  })
})
